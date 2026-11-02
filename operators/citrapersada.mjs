// Citra Persada — struk.citrapersada.net (SPA), API backend struk.citrapersada.co.id
// Endpoint: POST /getStruk  body JSON { no_kartu, tgl_awal, tgl_akhir }
// Respon: { query: [ { no_kartu, golongan, no_card, ruas, ... } ] }
// CATATAN: saat diverifikasi, backend .co.id balik 502 (server operator down).
// Field & path terpetakan dari JS bundle; adapter siap begitu server up.

export const name = "Citra Persada";

export async function fetchStruk(cardNumber, from, to) {
  const res = await fetch("https://struk.citrapersada.co.id/getStruk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ no_kartu: cardNumber, tgl_awal: from, tgl_akhir: to }),
  });
  if (!res.ok) throw new Error(`Citra Persada HTTP ${res.status}`);

  const json = await res.json();
  return Array.isArray(json.query) ? json.query : [];
}
