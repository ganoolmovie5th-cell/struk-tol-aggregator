// Tol Makassar — tolmakassar.com, Laravel.
// Endpoint terverifikasi: GET /struk?kartu=&tanggal_awal=&tanggal_akhir=
// Respon: { status: "success", data: [...] }

export const name = "Tol Makassar";

export async function fetchStruk(cardNumber, from, to) {
  const url = new URL("https://tolmakassar.com/struk");
  url.searchParams.set("kartu", cardNumber);
  url.searchParams.set("tanggal_awal", from);
  url.searchParams.set("tanggal_akhir", to);

  const res = await fetch(url, {
    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Tol Makassar HTTP ${res.status}`);

  const json = await res.json();
  if (json.status && json.status !== "success") throw new Error(`Tol Makassar: ${json.message || "gagal"}`);
  return Array.isArray(json.data) ? json.data : [];
}
