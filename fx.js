import { DEFAULT_FX } from "../../lib/fx";

let FX = { ...DEFAULT_FX };

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ fx: FX });
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const next = body?.fx || {};
      FX = { ...FX, ...next };
      return res.status(200).json({ fx: FX });
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
