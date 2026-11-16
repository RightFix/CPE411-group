import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSchema, withClient } from "./db.js";
import { getGroupSelections, setGroupSelection } from "./logic.js";
import {
  createGroupMaterial,
  deleteGroupMaterial,
  listGroupMaterials,
  requestMaterialUploadUrl,
} from "./materials.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/groups/:id/selections", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const selections = await getGroupSelections(groupId);
    if (!selections) return res.status(404).json({ error: "Group not found." });
    res.json({ selections });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/groups/:id/selections", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const { studentSn, subtopicIndex, roleId, regNo } = req.body || {};
    const out = await setGroupSelection(
      groupId,
      Number(studentSn),
      subtopicIndex === null || subtopicIndex === undefined ? null : Number(subtopicIndex),
      roleId ?? null,
      regNo
    );
    res.status(out.status).json(out.body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.get("/api/groups/:id/materials", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const data = await listGroupMaterials(withClient, groupId);
    if (!data) return res.status(404).json({ error: "Group not found." });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/groups/:id/materials/upload-url", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const out = await requestMaterialUploadUrl(groupId, req.body || {});
    res.status(out.status).json(out.body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/groups/:id/materials", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const out = await createGroupMaterial(withClient, groupId, req.body || {});
    res.status(out.status).json(out.body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.delete("/api/groups/:id/materials/:materialId", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const regNo = req.body?.regNo ?? req.query?.regNo;
    const out = await deleteGroupMaterial(withClient, groupId, String(req.params.materialId || ""), regNo);
    res.status(out.status).json(out.body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../dist");
app.use(express.static(dist));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) res.status(404).send("Not found. Run the build or use Vite dev server.");
  });
});

const port = Number(process.env.PORT || 3000);
ensureSchema()
  .then(() => {
    app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
  })
  .catch((e) => {
    console.error("Failed to start server:", e);
    process.exit(1);
  });
