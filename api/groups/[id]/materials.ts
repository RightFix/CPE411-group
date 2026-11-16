import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureSchema, withClient } from "../../_db.js";
import { createGroupMaterial, listGroupMaterials } from "../../../server/materials.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();
    const groupId = Number(req.query.id);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group id." });
    }

    if (req.method === "GET") {
      const data = await listGroupMaterials(withClient, groupId);
      if (!data) return res.status(404).json({ error: "Group not found." });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const out = await createGroupMaterial(withClient, groupId, (req.body || {}) as Record<string, unknown>);
      return res.status(out.status).json(out.body);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
}
