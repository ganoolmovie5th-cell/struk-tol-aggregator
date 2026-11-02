// Vercel serverless function: GET /api/struk?card=&from=&to=
// Panggil semua operator server-side (hindari masalah CORS di browser), balikin JSON gabungan.

import { aggregate, merge } from "../aggregate.mjs";

export default async function handler(req, res) {
  const { card, from, to } = req.query;

  if (!card || !from || !to) {
    res.status(400).json({ error: "Parameter wajib: card, from, to (YYYY-MM-DD)." });
    return;
  }

  try {
    const results = await aggregate(card, from, to);
    res.status(200).json({
      transactions: merge(results),
      perOperator: results.map((r) =>
        r.ok ? { operator: r.operator, count: r.count } : { operator: r.operator, error: r.error }
      ),
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
