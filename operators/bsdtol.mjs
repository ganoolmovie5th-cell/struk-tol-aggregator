// BSD Tol — Gerbang Pondok Aren (bsdtol.com), Laravel + DataTables serverSide.
// Endpoint terverifikasi: GET /struk?kartu=&tanggal_awal=&tanggal_akhir= (AJAX)
// Wajib header X-Requested-With. Respon: { data: [{transaksi,gardu,gol,payment,saldo,resi}] }

export const name = "BSD Tol";

export async function fetchStruk(cardNumber, from, to) {
  const url = new URL("https://bsdtol.com/struk");
  url.searchParams.set("kartu", cardNumber);
  url.searchParams.set("tanggal_awal", from);
  url.searchParams.set("tanggal_akhir", to);
  url.searchParams.set("draw", "1");
  url.searchParams.set("start", "0");
  url.searchParams.set("length", "100");

  const res = await fetch(url, {
    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`BSD Tol HTTP ${res.status}`);

  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}
