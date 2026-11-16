import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestMaterialUploadUrl } from "../../../../server/materials.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed." });
    }

    const groupId = Number(req.query.id);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group id." });
    }

    const out = await requestMaterialUploadUrl(groupId, (req.body || {}) as Record<string, unknown>);
    return res.status(out.status).json(out.body);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
}
