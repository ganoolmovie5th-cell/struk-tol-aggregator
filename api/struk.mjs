// Vercel serverless function: GET /api/struk?card=&from=&to=
// Self-contained (semua logic inline) — tidak import file di luar folder api/,
// supaya dijamin ter-bundle oleh Vercel (hindari ERR_MODULE_NOT_FOUND).

// fetch dengan timeout koneksi (putus kalau operator nggak respon dalam 10s)
const f = (url, opt = {}) => fetch(url, { signal: AbortSignal.timeout(8000), ...opt });

// ---------------------------------------------------------------- operators
const OPERATORS = [
  {
    name: "Astra Tol",
    async fetchStruk(card, from, to) {
      const form = new FormData();
      form.append("keyword", card);
      form.append("periodeAwal", from);
      form.append("periodeAkhir", to);
      const res = await f("https://astratol.co.id/api/struk", { method: "POST", body: form });
      if (!res.ok) throw new Error(`Astra Tol HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    },
  },
  {
    name: "Serbaraja",
    async fetchStruk(card, from, to) {
      const url = new URL("https://serbaraja.sinarmasland.com/api/receipt");
      url.searchParams.set("cardNumber", card);
      url.searchParams.set("dateFrom", from);
      url.searchParams.set("dateTo", to);
      const res = await f(url);
      if (!res.ok) throw new Error(`Serbaraja HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
    },
  },
  {
    name: "JTD",
    async fetchStruk(card, from, to) {
      const url = new URL("https://bc01.jtd.co.id/api/jlp/beranda/struk");
      url.searchParams.set("noKartu", card);
      url.searchParams.set("tglAwal", from);
      url.searchParams.set("tglAkhir", to);
      const res = await f(url);
      if (!res.ok) throw new Error(`JTD HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== "success") throw new Error(`JTD: ${json.message || "gagal"}`);
      return Array.isArray(json.data) ? json.data : [];
    },
  },
  {
    name: "BSD Tol",
    async fetchStruk(card, from, to) {
      const url = new URL("https://bsdtol.com/struk");
      url.searchParams.set("kartu", card);
      url.searchParams.set("tanggal_awal", from);
      url.searchParams.set("tanggal_akhir", to);
      url.searchParams.set("draw", "1");
      url.searchParams.set("start", "0");
      url.searchParams.set("length", "100");
      const res = await f(url, { headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" } });
      if (!res.ok) throw new Error(`BSD Tol HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    },
  },
  {
    name: "Tol Makassar",
    async fetchStruk(card, from, to) {
      const url = new URL("https://tolmakassar.com/struk");
      url.searchParams.set("kartu", card);
      url.searchParams.set("tanggal_awal", from);
      url.searchParams.set("tanggal_akhir", to);
      const res = await f(url, { headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" } });
      if (!res.ok) throw new Error(`Tol Makassar HTTP ${res.status}`);
      const json = await res.json();
      if (json.status && json.status !== "success") throw new Error(`Tol Makassar: ${json.message || "gagal"}`);
      return Array.isArray(json.data) ? json.data : [];
    },
  },
  {
    name: "Citra Persada",
    async fetchStruk(card, from, to) {
      const res = await f("https://struk.citrapersada.co.id/getStruk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no_kartu: card, tgl_awal: from, tgl_akhir: to }),
      });
      if (!res.ok) throw new Error(`Citra Persada HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.query) ? json.query : [];
    },
  },
  {
    name: "JLB",
    async fetchStruk(card, from, to) {
      const base = "https://strukdigital.jlbjorrw1.com/struk";
      const pageRes = await f(base);
      if (!pageRes.ok) throw new Error(`JLB page HTTP ${pageRes.status}`);
      const setCookies = pageRes.headers.getSetCookie?.() ?? [];
      const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
      const html = await pageRes.text();
      const token = html.match(/name="_token"[^>]*value="([^"]+)"/)?.[1];
      if (!token) throw new Error("JLB: _token tidak ditemukan");
      const body = new URLSearchParams({ _token: token, card_number: card, start_date: from, end_date: to });
      const res = await f(base, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}) },
        body,
      });
      if (!res.ok) throw new Error(`JLB HTTP ${res.status}`);
      return parseJlbRows(await res.text());
    },
  },
];

function parseJlbRows(html) {
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || "";
  const rows = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rows
    .map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1].replace(/<[^>]*>/g, "").trim()))
    .filter((cols) => cols.some((c) => c !== "")); // buang baris kosong
}

// ---------------------------------------------------------------- normalize
const BULAN = { januari:"01",februari:"02",maret:"03",april:"04",mei:"05",juni:"06",juli:"07",agustus:"08",september:"09",oktober:"10",november:"11",desember:"12" };

function parseDate(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  const pad = (v) => String(v).padStart(2, "0");
  const iso = (y, mo, d, h, mi) => `${y}-${pad(mo)}-${pad(d)}` + (h != null ? `T${pad(h)}:${pad(mi)}` : "");
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) return iso(m[1], m[2], m[3], m[4], m[5]);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return iso(m[3], m[2], m[1], m[4], m[5]);
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[ ,]+(\d{1,2})[.:](\d{2}))?/);
  if (m && BULAN[m[2].toLowerCase()]) return iso(m[3], BULAN[m[2].toLowerCase()], m[1], m[4], m[5]);
  return null;
}

const pick = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k] != null && obj[k] !== "") return obj[k];
  return undefined;
};

function mapRow(operator, r) {
  if (Array.isArray(r)) return { operator, raw: r };
  const mapped = {
    timestamp: pick(r, "tgl_transaksi", "tanggal", "transaksi", "waktu", "timestamp", "date"),
    gate: pick(r, "gardu", "gardu_type", "gerbang", "gate", "ruas"),
    vehicleClass: pick(r, "gol", "golongan", "vehicleClass"),
    amount: pick(r, "tarif", "payment", "amount", "nominal"),
    endingBalance: pick(r, "saldo", "sisa_saldo", "endingBalance", "ending_balance"),
    receiptNo: pick(r, "resi", "no_resi", "receiptNo", "receipt_numbers"),
  };
  return { operator, ...mapped, timestampISO: parseDate(mapped.timestamp), raw: r };
}

// batasi tiap operator maksimal N ms — operator yang hang nggak bikin function timeout
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout ${ms}ms`)), ms)),
  ]);
}

// ---------------------------------------------------------------- handler
export default async function handler(req, res) {
  const { card, from, to } = req.query;
  if (!card || !from || !to) {
    res.status(400).json({ error: "Parameter wajib: card, from, to (YYYY-MM-DD)." });
    return;
  }
  if (!/^\d{15,16}$/.test(card)) {
    res.status(400).json({ error: "Nomor kartu harus 15-16 digit." });
    return;
  }

  const settled = await Promise.allSettled(
    OPERATORS.map((op) => withTimeout(op.fetchStruk(card, from, to), 9000, op.name))
  );

  const perOperator = [];
  const transactions = [];
  settled.forEach((r, i) => {
    const op = OPERATORS[i];
    if (r.status === "fulfilled") {
      const rows = r.value.map((row) => mapRow(op.name, row));
      transactions.push(...rows);
      perOperator.push({ operator: op.name, count: rows.length });
    } else {
      perOperator.push({ operator: op.name, error: r.reason?.message || "gagal" });
    }
  });

  transactions.sort((a, b) =>
    String(b.timestampISO ?? b.timestamp ?? "").localeCompare(String(a.timestampISO ?? a.timestamp ?? ""))
  );

  res.status(200).json({ transactions, perOperator });
}
