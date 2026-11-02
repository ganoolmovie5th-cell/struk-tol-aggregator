// Parse timestamp struk tol -> ISO 8601 (YYYY-MM-DDTHH:mm).
// Format yang didukung berdasarkan bukti dari bundle operator:
//   - DD/MM/YYYY HH:mm  dan  DD-MM-YYYY HH:mm   (Citra, Astra)
//   - DD/MM/YYYY        dan  DD-MM-YYYY         (tanpa jam)
//   - "D MMMM YYYY"     nama bulan Indonesia    (Astra, format LLLL)
//   - YYYY-MM-DD...     sudah ISO-ish           (passthrough)
// Kalau nggak dikenali: kembalikan null (JANGAN nebak -> nanti pakai string asli).

const BULAN = {
  januari: "01", februari: "02", maret: "03", april: "04",
  mei: "05", juni: "06", juli: "07", agustus: "08",
  september: "09", oktober: "10", november: "11", desember: "12",
};

/**
 * @param {string} raw  string tanggal dari operator
 * @returns {string|null} ISO "YYYY-MM-DDTHH:mm" atau null kalau format tak dikenal
 */
export function parseDate(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();

  // sudah ISO: 2025-10-31 atau 2025-10-31T08:30 atau 2025-10-31 08:30
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) return iso(m[1], m[2], m[3], m[4], m[5]);

  // DD/MM/YYYY atau DD-MM-YYYY, opsional HH:mm
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return iso(m[3], m[2], m[1], m[4], m[5]);

  // D MMMM YYYY (nama bulan Indonesia), opsional HH:mm / HH.mm
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[ ,]+(\d{1,2})[.:](\d{2}))?/);
  if (m) {
    const mm = BULAN[m[2].toLowerCase()];
    if (mm) return iso(m[3], mm, m[1], m[4], m[5]);
  }

  return null; // format tak dikenal -> caller pakai string asli
}

function iso(y, mo, d, h, mi) {
  const pad = (v, n = 2) => String(v).padStart(n, "0");
  const date = `${y}-${pad(mo)}-${pad(d)}`;
  return h != null ? `${date}T${pad(h)}:${pad(mi)}` : date;
}
