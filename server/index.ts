import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSchema } from "./db.js";
import { getState, pickSeat, releaseSeat } from "./logic.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/selection", async (_req, res) => {
  try {
    const state = await getState();
    res.json(state);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/selection", async (req, res) => {
  try {
    const { name, regNo, subtopicId, roleId } = req.body || {};
    const out = await pickSeat(name, regNo, subtopicId, roleId);
    res.status(out.status).json(out.body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.delete("/api/selection", async (req, res) => {
  try {
    const { name, regNo } = { ...(req.body || {}), ...(req.query || {}) } as any;
    const out = await releaseSeat(name, regNo);
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
