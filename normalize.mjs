// Normalisasi struk antar-operator ke satu bentuk seragam.
//
// Target field (subset relevan tol, pola dari schema unified CekSaldo):
//   operator      nama operator
//   timestamp     waktu transaksi (string asli operator; belum di-parse ke ISO
//                 karena format tiap operator beda & belum terlihat dgn data asli)
//   gate          gardu / gerbang
//   vehicleClass  golongan kendaraan
//   amount        tarif / nominal transaksi
//   endingBalance sisa saldo setelah transaksi
//   receiptNo     nomor resi / struk
//   raw           objek mentah asli (jaga-jaga field yg belum ter-map)
//
// Tiap operator kasih field mentah beda. Mapping di bawah berdasarkan field yg
// SUDAH terlihat dari investigasi. Yang belum terlihat (data asli) -> undefined,
// dan `raw` tetap menyimpan aslinya biar nggak ada data hilang.

import { parseDate } from "./parse-date.mjs";

const pick = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k] != null && obj[k] !== "") return obj[k];
  return undefined;
};

// map per-operator: terima row mentah -> field seragam
const MAPPERS = {
  "Astra Tol": (r) => ({
    timestamp: pick(r, "tgl_transaksi", "tanggal", "waktu"),
    gate: pick(r, "gardu", "gardu_type", "gerbang"),
    vehicleClass: pick(r, "gol", "golongan"),
    amount: pick(r, "tarif", "payment", "amount"),
    endingBalance: pick(r, "saldo", "sisa_saldo"),
    receiptNo: pick(r, "resi", "no_resi"),
  }),
  "BSD Tol": (r) => ({
    timestamp: pick(r, "transaksi", "waktu"),
    gate: pick(r, "gardu", "gerbang"),
    vehicleClass: pick(r, "gol", "golongan"),
    amount: pick(r, "payment", "tarif"),
    endingBalance: pick(r, "saldo"),
    receiptNo: pick(r, "resi"),
  }),
  "Citra Persada": (r) => ({
    timestamp: pick(r, "tgl_transaksi", "tanggal", "waktu"),
    gate: pick(r, "gardu", "gerbang", "ruas"),
    vehicleClass: pick(r, "golongan", "gol"),
    amount: pick(r, "tarif", "payment"),
    endingBalance: pick(r, "saldo", "sisa_saldo"),
    receiptNo: pick(r, "resi", "no_resi"),
  }),
};

// fallback generik: coba nama field paling umum
const genericMapper = (r) => ({
  timestamp: pick(r, "timestamp", "tgl_transaksi", "tanggal", "transaksi", "waktu", "date"),
  gate: pick(r, "gate", "gardu", "gerbang", "ruas"),
  vehicleClass: pick(r, "vehicleClass", "golongan", "gol"),
  amount: pick(r, "amount", "tarif", "payment", "nominal"),
  endingBalance: pick(r, "endingBalance", "saldo", "sisa_saldo", "ending_balance"),
  receiptNo: pick(r, "receiptNo", "resi", "no_resi", "receipt_numbers"),
});

/**
 * @param {string} operator  nama operator
 * @param {Array}  rows      baris mentah dari adapter
 * @returns {Array} baris ter-normalisasi
 */
export function normalize(operator, rows) {
  const mapper = MAPPERS[operator] || genericMapper;
  return rows.map((r) => {
    // JLB kirim array of cells (bukan object) — bungkus ke raw saja
    if (Array.isArray(r)) return { operator, raw: r };
    const mapped = mapper(r);
    // timestampISO: hasil parse (null kalau format tak dikenal -> pakai timestamp asli)
    const timestampISO = parseDate(mapped.timestamp) ?? null;
    return { operator, ...mapped, timestampISO, raw: r };
  });
}
