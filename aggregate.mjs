// Agregator struk tol. Panggil semua operator paralel, gabung hasil.
// Tambah operator baru: bikin file di operators/, export { name, fetchStruk }, daftar di bawah.

import * as astratol from "./operators/astratol.mjs";
import * as serbaraja from "./operators/serbaraja.mjs";
import * as jtd from "./operators/jtd.mjs";
import * as bsdtol from "./operators/bsdtol.mjs";
import * as tolmakassar from "./operators/tolmakassar.mjs";
import * as citrapersada from "./operators/citrapersada.mjs";
import * as jlb from "./operators/jlb.mjs";
import { normalize } from "./normalize.mjs";

const OPERATORS = [astratol, serbaraja, jtd, bsdtol, tolmakassar, citrapersada, jlb];

function validate(card, from, to) {
  if (!/^\d{15,16}$/.test(card)) throw new Error("Nomor kartu harus 15-16 digit.");
  const d = /^\d{4}-\d{2}-\d{2}$/;
  if (!d.test(from) || !d.test(to)) throw new Error("Tanggal format YYYY-MM-DD.");
}

export async function aggregate(card, from, to) {
  validate(card, from, to);

  const settled = await Promise.allSettled(
    OPERATORS.map((op) => op.fetchStruk(card, from, to))
  );

  const results = [];
  settled.forEach((r, i) => {
    const op = OPERATORS[i];
    if (r.status === "fulfilled") {
      results.push({ operator: op.name, ok: true, count: r.value.length, data: normalize(op.name, r.value) });
    } else {
      results.push({ operator: op.name, ok: false, error: r.reason.message });
    }
  });
  return results;
}

// CLI
// gabung semua transaksi dari operator yang sukses, urut by tanggal (terbaru dulu)
export function merge(results) {
  return results
    .filter((r) => r.ok)
    .flatMap((r) => r.data)
    .sort((a, b) => String(b.timestampISO ?? b.timestamp ?? "").localeCompare(String(a.timestampISO ?? a.timestamp ?? "")));
}

// CLI hanya jalan kalau file dipanggil langsung (bukan saat di-import serverless)
import { fileURLToPath } from "node:url";
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) runCli();

function runCli() {
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const [card, from, to] = args.filter((a) => !a.startsWith("--"));
if (!card || !from || !to) {
  console.log("Usage: node aggregate.mjs <nomor_kartu> <periodeAwal> <periodeAkhir> [--json]");
  console.log("Contoh: node aggregate.mjs 1234567890123456 2025-10-01 2025-10-31");
  process.exit(1);
}

aggregate(card, from, to)
  .then((results) => {
    if (asJson) {
      // output bersih: satu list transaksi tergabung + ringkasan error
      console.log(JSON.stringify({
        transactions: merge(results),
        errors: results.filter((r) => !r.ok).map((r) => ({ operator: r.operator, error: r.error })),
      }, null, 2));
      return;
    }
    for (const r of results) {
      if (r.ok) console.log(`\n== ${r.operator} == (${r.count} transaksi)\n`, JSON.stringify(r.data, null, 2));
      else console.log(`\n== ${r.operator} == GAGAL: ${r.error}`);
    }
    const all = merge(results);
    console.log(`\n== TOTAL == ${all.length} transaksi dari ${results.filter((r) => r.ok).length} operator sukses`);
  })
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
}
