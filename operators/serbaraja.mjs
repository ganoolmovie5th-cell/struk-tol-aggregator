// Serbaraja — Tol Serpong-Balaraja (serbaraja.sinarmasland.com)
// Endpoint terverifikasi: GET /api/receipt?cardNumber=&dateFrom=&dateTo=
// Respon: array JSON langsung. Publik tanpa auth.

export const name = "Serbaraja";

export async function fetchStruk(cardNumber, from, to) {
  const url = new URL("https://serbaraja.sinarmasland.com/api/receipt");
  url.searchParams.set("cardNumber", cardNumber);
  url.searchParams.set("dateFrom", from);
  url.searchParams.set("dateTo", to);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Serbaraja HTTP ${res.status}`);

  const json = await res.json();
  // respon berupa array langsung
  return Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
}
