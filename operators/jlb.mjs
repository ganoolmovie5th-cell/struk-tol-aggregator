// JLB — JORR W1 (strukdigital.jlbjorrw1.com), Laravel + CSRF.
// Flow: GET /struk (ambil _token + cookie) -> POST /struk (form) -> HTML dgn <table>.
// Field: card_number, start_date, end_date. Hasil di-render inline sbg baris tabel.

export const name = "JLB";

export async function fetchStruk(cardNumber, from, to) {
  const base = "https://strukdigital.jlbjorrw1.com/struk";

  // 1. ambil CSRF token + SEMUA cookie (Laravel butuh laravel_session + XSRF-TOKEN)
  const pageRes = await fetch(base);
  if (!pageRes.ok) throw new Error(`JLB page HTTP ${pageRes.status}`);
  const setCookies = pageRes.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
  const html = await pageRes.text();
  const token = html.match(/name="_token"[^>]*value="([^"]+)"/)?.[1];
  if (!token) throw new Error("JLB: _token tidak ditemukan");

  // 2. POST pencarian
  const body = new URLSearchParams({
    _token: token,
    card_number: cardNumber,
    start_date: from,
    end_date: to,
  });
  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  });
  if (!res.ok) throw new Error(`JLB HTTP ${res.status}`);

  // 3. parse baris tabel dari HTML (hasil di-render inline)
  const resultHtml = await res.text();
  return parseRows(resultHtml);
}

// Parser minimal: ambil <tbody>...<tr><td>..</td></tr>. Kolom disimpan apa adanya.
function parseRows(html) {
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || "";
  const rows = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rows
    .map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1].replace(/<[^>]*>/g, "").trim()))
    .filter((cols) => cols.length > 0);
}
