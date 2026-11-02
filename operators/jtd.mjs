// JTD — Jogja Tol / Jalan Tol Desari (bc01.jtd.co.id)
// Endpoint terverifikasi: GET /api/jlp/beranda/struk?noKartu=&tglAwal=&tglAkhir=
// Respon: { status: "success", data: [...] }. Publik tanpa auth.

export const name = "JTD";

export async function fetchStruk(cardNumber, from, to) {
  const url = new URL("https://bc01.jtd.co.id/api/jlp/beranda/struk");
  url.searchParams.set("noKartu", cardNumber);
  url.searchParams.set("tglAwal", from);
  url.searchParams.set("tglAkhir", to);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`JTD HTTP ${res.status}`);

  const json = await res.json();
  if (json.status !== "success") throw new Error(`JTD: ${json.message || "respon tidak sukses"}`);
  return Array.isArray(json.data) ? json.data : [];
}
