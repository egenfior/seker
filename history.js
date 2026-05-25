import { getPriceHistory } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.query.asin) {
    return res.status(400).json({ error: "Missing asin" });
  }

  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const data = await getPriceHistory({ source: req.query.source || "amazon", asin: req.query.asin, limit });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Database read failed" });
  }
}
