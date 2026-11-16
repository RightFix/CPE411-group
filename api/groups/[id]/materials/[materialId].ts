import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureSchema, withClient } from "../../../_db.js";
import { deleteGroupMaterial } from "../../../../server/materials.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "DELETE") {
      res.setHeader("Allow", "DELETE");
      return res.status(405).json({ error: "Method not allowed." });
    }

    await ensureSchema();
    const groupId = Number(req.query.id);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group id." });
    }

    const materialId = String(req.query.materialId || "");
    const regNo = (req.body as Record<string, unknown> | undefined)?.regNo ?? req.query.regNo;
    const out = await deleteGroupMaterial(withClient, groupId, materialId, regNo);
    return res.status(out.status).json(out.body);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
}
