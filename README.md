<p align="center">
  <img src="public/logo.svg" width="64" alt="struk-tol" />
</p>

<h1 align="center">struk-tol</h1>

Kumpulkan struk digital transaksi tol dari portal publik beberapa operator, lewat satu input nomor kartu + rentang tanggal. Cek transaksi tol **kartumu sendiri** dari banyak operator sekaligus.

Website (frontend + serverless API) siap deploy di Vercel. Juga punya CLI.

## Deploy ke Vercel

1. Import repo ini di Vercel (framework preset: **Other**, tanpa build command — statis + serverless).
2. `public/` jadi root statis, `api/struk.mjs` jadi serverless function otomatis.
3. Deploy. API dipanggil server-side jadi tidak kena CORS browser.

## Struktur

```
public/            frontend statis (index.html, style.css, app.js, logo.svg)
api/struk.mjs      serverless: GET /api/struk?card=&from=&to=
aggregate.mjs      core: aggregate() + merge() + CLI
normalize.mjs      mapper field seragam + timestampISO
parse-date.mjs     parser tanggal ID -> ISO
operators/*.mjs    1 adapter per operator
```

## Cara kerja

Tiap operator tol punya portal struk digital publik (tanpa login) yang nerima nomor kartu e-money + tanggal, balikin daftar transaksi di ruas tol-nya. Tool ini manggil portal-portal itu paralel lalu gabung hasilnya.

```
Input: nomor kartu (15-16 digit) + periodeAwal + periodeAkhir (YYYY-MM-DD)
   ↓  paralel ke tiap operator
   ↓
Output: gabungan struk, diurut tanggal
```

## Status operator

| Operator | Endpoint | Method / Params | Status |
|----------|----------|------|:---:|
| Astra Tol (Tangerang-Merak, Cikopo-Palimanan, Jombang-Mojokerto) | `astratol.co.id/api/struk` | POST form: `keyword`, `periodeAwal`, `periodeAkhir` | ✅ |
| Serbaraja | `serbaraja.sinarmasland.com/api/receipt` | GET: `cardNumber`, `dateFrom`, `dateTo` | ✅ |
| JTD | `bc01.jtd.co.id/api/jlp/beranda/struk` | GET: `noKartu`, `tglAwal`, `tglAkhir` | ✅ |
| BSD Tol | `bsdtol.com/struk` | GET+AJAX: `kartu`, `tanggal_awal`, `tanggal_akhir` | ✅ |
| Tol Makassar | `tolmakassar.com/struk` | GET+AJAX: `kartu`, `tanggal_awal`, `tanggal_akhir` | ✅ |
| JLB | `strukdigital.jlbjorrw1.com/struk` | Laravel: GET token -> POST `card_number`, `start_date`, `end_date` | ✅ |
| Citra Persada | `struk.citrapersada.co.id/getStruk` | POST JSON: `no_kartu`, `tgl_awal`, `tgl_akhir` | ⚠️ server 502 (down) |
| Travoy (Jasa Marga) | `travoy-resi.jmto.co.id` | **gated** — butuh app + akun terdaftar (auth) | ❌ dikecualikan |
| Margaharjaya (Jombang-Mojokerto) | `api-struk.margaharjaya.co.id` | backend ruas Astra — sudah tercakup via portal Astra | — |

Endpoint ditemukan dari public receipt pages tiap operator (string URL yang sama dipakai app CekSaldo). Param beda tiap operator — error body mereka ("missing parameters: ...") yang ngasih tahu field benar.

**Travoy sengaja dikecualikan:** portalnya balik "Fitur ini hanya dapat diakses melalui aplikasi dan akun yang sudah terdaftar" — di balik auth. Bukan portal publik, jadi tidak diagregasi (bypass auth = di luar koridor). Pakai app Travoy resmi untuk ruas Jasa Marga.

Astra sudah jalan. Operator lain tinggal tambah adapter begitu endpoint-nya diverifikasi (pola sama: nomor kartu + 2 tanggal).

## Batasan (jujur)

- Cuma transaksi di ruas tol operator yang didukung. Bukan "semua transaksi kartu".
- Data: tanggal, gerbang, golongan, tarif. **Bukan** saldo, bukan identitas pemilik.
- Mozy by HK = aplikasi NFC, **tidak** punya portal web publik → tidak bisa diagregasi di sini.
- Endpoint publik bisa berubah sewaktu-waktu (bukan API resmi berkontrak).

## Etika / legal

Tool ini untuk user cek struk tol **kartunya sendiri**. Jangan:
- Scraping massal nomor kartu orang
- Nyimpan/jual data transaksi
- Bikin DB profiling

## Jalankan

```bash
# mode default: per operator + total
node aggregate.mjs <nomor_kartu> <periodeAwal> <periodeAkhir>

# mode JSON: satu list transaksi tergabung (urut tanggal, terbaru dulu) + errors
node aggregate.mjs <nomor_kartu> <periodeAwal> <periodeAkhir> --json

# contoh:
node aggregate.mjs 1234567890123456 2025-10-01 2025-10-31 --json
```

`--json` menggabung transaksi semua operator sukses jadi satu array `transactions`, diurut by `timestampISO`, plus daftar `errors` dari operator yang gagal.

## Normalisasi

Tiap operator balikin field dengan nama beda (`tgl_transaksi` vs `transaksi` vs `tanggal`, `gol` vs `golongan`, dst). `normalize.mjs` nyatuin ke satu bentuk:

```
operator        nama operator
timestamp       waktu transaksi (string asli operator)
gate            gardu / gerbang
vehicleClass    golongan kendaraan
amount          tarif
endingBalance   sisa saldo
receiptNo       nomor resi
raw             objek mentah asli (fallback, nggak ada data hilang)
```

Plus `timestampISO`: hasil `parse-date.mjs` → `YYYY-MM-DDTHH:mm`. Mendukung format yang terbukti dari bundle operator: `DD/MM/YYYY HH:mm`, `DD-MM-YYYY`, `D MMMM YYYY` (nama bulan Indonesia), dan ISO. Format tak dikenal → `null` (nggak nebak), pakai `timestamp` asli.

**Catatan:** mapping field berdasarkan yang terlihat saat investigasi (semua tes pakai nomor dummy → kosong). Field belum terlihat jatuh ke `undefined`, tapi `raw` selalu simpan aslinya. Begitu ditest dengan kartu asli, sesuaikan mapper di `normalize.mjs` sesuai field yang beneran muncul.

## Arsitektur

```
aggregate.mjs            CLI + Promise.allSettled paralel + validasi input
normalize.mjs            mapper field mentah -> bentuk seragam (per-operator + fallback)
operators/<nama>.mjs     1 file per operator: export { name, fetchStruk }
```

Tambah operator: bikin file di `operators/`, export `name` + `fetchStruk(card, from, to)`, daftar di array `OPERATORS` di `aggregate.mjs`. Kalau field barunya beda, tambah entry di `MAPPERS` (`normalize.mjs`).
