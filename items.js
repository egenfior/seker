import { getIndexedItems } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const data = await getIndexedItems({ source: req.query.source || "amazon", limit });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Database read failed" });
  }
}
