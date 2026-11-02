// Astra Tol — astratol.co.id
// Satu portal cover 3 ruas: Tangerang-Merak, Cikopo-Palimanan, Jombang-Mojokerto.
// Endpoint terverifikasi: POST /api/struk, FormData, publik tanpa auth.

export const name = "Astra Tol";

/**
 * @param {string} cardNumber  nomor e-money 15-16 digit
 * @param {string} from        YYYY-MM-DD
 * @param {string} to          YYYY-MM-DD
 * @returns {Promise<Array>}   daftar transaksi (bentuk asli dari operator)
 */
export async function fetchStruk(cardNumber, from, to) {
  const form = new FormData();
  form.append("keyword", cardNumber);
  form.append("periodeAwal", from);
  form.append("periodeAkhir", to);

  const res = await fetch("https://astratol.co.id/api/struk", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Astra Tol HTTP ${res.status}`);

  const json = await res.json();
  // bentuk respon: { status: "success", data: [...] }
  return Array.isArray(json.data) ? json.data : [];
}
