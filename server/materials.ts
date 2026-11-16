import crypto from "node:crypto";
import { createRequire } from "node:module";
import type { PoolClient } from "pg";
import {
  createSignedReadUrl,
  createSignedUploadUrl,
  deleteStorageObject,
  isStorageConfigured,
} from "./storage.js";

const require = createRequire(import.meta.url);
const groups = require("../src/data/groups.json") as {
  id: number;
  name: string;
  students: { sn: number; name: string; regNo: string }[];
}[];
const topics = require("../src/data/topics.json") as {
  id: number;
  title: string;
  subtopics: string[];
}[];

export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".key",
  ".odp",
  ".odt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

export type MaterialRow = {
  id: string;
  group_id: number;
  student_sn: number;
  uploader_name: string;
  uploader_reg_no: string;
  subtopic_index: number;
  kind: "file" | "link";
  title: string;
  note: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: string | number | null;
  external_url: string | null;
  created_at: string | Date;
};

export type MaterialDTO = {
  id: string;
  groupId: number;
  studentSn: number;
  uploaderName: string;
  uploaderRegNo: string;
  subtopicIndex: number;
  kind: "file" | "link";
  title: string;
  note: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  externalUrl: string | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
};

function getExt(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
  return base.slice(0, 100) || "material";
}

function findGroupAndStudent(groupId: number, regNo?: unknown) {
  const group = groups.find((g) => g.id === groupId);
  const topic = topics.find((t) => t.id === groupId);
  if (!group || !topic) {
    return { error: { status: 404, body: { error: "Group not found." } } };
  }
  const regNorm = String(regNo || "").trim().toLowerCase();
  if (!regNorm) {
    return { error: { status: 401, body: { error: "Login required." } } };
  }
  const student = group.students.find((s) => s.regNo.trim().toLowerCase() === regNorm);
  if (!student) {
    return {
      error: {
        status: 403,
        body: { error: `Only members of ${group.name} can modify materials here.` },
      },
    };
  }
  return { group, topic, student };
}

function isValidSubtopicIndex(idx: unknown, count: number): idx is number {
  return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 && idx < count;
}

async function mapRowToDTO(row: MaterialRow): Promise<MaterialDTO> {
  let previewUrl: string | null = null;
  let downloadUrl: string | null = null;

  if (row.kind === "file" && row.storage_path) {
    const [inlineUrl, dlUrl] = await Promise.all([
      createSignedReadUrl(row.storage_path),
      createSignedReadUrl(row.storage_path, row.file_name || "download"),
    ]);
    previewUrl = inlineUrl;
    downloadUrl = dlUrl;
  }

  return {
    id: row.id,
    groupId: Number(row.group_id),
    studentSn: Number(row.student_sn),
    uploaderName: row.uploader_name,
    uploaderRegNo: row.uploader_reg_no,
    subtopicIndex: Number(row.subtopic_index),
    kind: row.kind,
    title: row.title,
    note: row.note,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    externalUrl: row.external_url,
    previewUrl,
    downloadUrl,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listGroupMaterials(
  withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
  groupId: number
) {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const rows = await withClient(async (c) => {
    const res = await c.query<MaterialRow>(
      `SELECT id, group_id, student_sn, uploader_name, uploader_reg_no, subtopic_index,
              kind, title, note, storage_path, file_name, mime_type, size_bytes, external_url, created_at
       FROM group_materials
       WHERE group_id = $1
       ORDER BY created_at DESC`,
      [groupId]
    );
    return res.rows;
  });

  const materials = await Promise.all(rows.map(mapRowToDTO));
  return { materials, storageConfigured: isStorageConfigured() };
}

export async function requestMaterialUploadUrl(
  groupId: number,
  body: Record<string, unknown>
) {
  const auth = findGroupAndStudent(groupId, body?.regNo);
  if (auth.error) return auth.error;
  const { topic } = auth;

  if (!isStorageConfigured()) {
    return {
      status: 503,
      body: {
        error: "File storage is not configured on the server yet. You can still share external links.",
      },
    };
  }

  const subtopicIndex = body?.subtopicIndex == null ? NaN : Number(body.subtopicIndex);
  if (!isValidSubtopicIndex(subtopicIndex, topic.subtopics.length)) {
    return { status: 400, body: { error: "Please select a valid subtopic." } };
  }

  const fileName = String(body?.fileName || "").trim();
  const ext = getExt(fileName);
  if (!fileName || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      status: 400,
      body: {
        error:
          "Unsupported file type. Allowed: PDF, PPT/PPTX, DOC/DOCX, KEY, ODP/ODT, PNG, JPG, WEBP.",
      },
    };
  }

  const sizeBytes = Number(body?.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_MATERIAL_BYTES) {
    return {
      status: 400,
      body: { error: "File size must be between 1 byte and 25 MB." },
    };
  }

  const storagePath = `group-${groupId}/subtopic-${subtopicIndex + 1}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  const signed = await createSignedUploadUrl(storagePath);
  return { status: 200, body: signed };
}

export async function createGroupMaterial(
  withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
  groupId: number,
  body: Record<string, unknown>
) {
  const auth = findGroupAndStudent(groupId, body?.regNo);
  if (auth.error) return auth.error;
  const { topic, student } = auth;

  const subtopicIndex = body?.subtopicIndex == null ? NaN : Number(body.subtopicIndex);
  if (!isValidSubtopicIndex(subtopicIndex, topic.subtopics.length)) {
    return { status: 400, body: { error: "Please select a valid subtopic." } };
  }

  const kind = body?.kind === "link" ? "link" : body?.kind === "file" ? "file" : null;
  if (!kind) {
    return { status: 400, body: { error: "Material kind must be 'file' or 'link'." } };
  }

  const title = String(body?.title || "").trim();
  if (!title || title.length > 140) {
    return { status: 400, body: { error: "Title is required (max 140 characters)." } };
  }

  const rawNote = body?.note == null ? "" : String(body.note).trim();
  if (rawNote.length > 300) {
    return { status: 400, body: { error: "Note must be 300 characters or less." } };
  }
  const note = rawNote || null;

  let storagePath: string | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;
  let sizeBytes: number | null = null;
  let externalUrl: string | null = null;

  if (kind === "file") {
    storagePath = String(body?.storagePath || "").trim();
    fileName = String(body?.fileName || "").trim();
    mimeType = body?.mimeType ? String(body.mimeType).trim().slice(0, 120) : null;
    sizeBytes = Number(body?.sizeBytes);

    if (!storagePath || !storagePath.startsWith(`group-${groupId}/`)) {
      return { status: 400, body: { error: "Invalid storage path for this group." } };
    }
    if (!fileName || !ALLOWED_EXTENSIONS.has(getExt(fileName))) {
      return { status: 400, body: { error: "Unsupported file type." } };
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_MATERIAL_BYTES) {
      return { status: 400, body: { error: "Invalid file size (max 25 MB)." } };
    }
  } else {
    const rawUrl = String(body?.externalUrl || "").trim();
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { status: 400, body: { error: "Link must start with https:// or http://." } };
      }
      externalUrl = parsed.toString();
    } catch {
      return { status: 400, body: { error: "Please enter a valid URL (e.g. https://...)." } };
    }
  }

  const inserted = await withClient(async (c) => {
    const res = await c.query<MaterialRow>(
      `INSERT INTO group_materials (
         group_id, student_sn, uploader_name, uploader_reg_no, subtopic_index,
         kind, title, note, storage_path, file_name, mime_type, size_bytes, external_url
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        groupId,
        student.sn,
        student.name,
        student.regNo,
        subtopicIndex,
        kind,
        title,
        note,
        storagePath,
        fileName,
        mimeType,
        sizeBytes,
        externalUrl,
      ]
    );
    return res.rows[0];
  });

  const material = await mapRowToDTO(inserted);
  return { status: 201, body: { material } };
}

export async function deleteGroupMaterial(
  withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
  groupId: number,
  materialId: string,
  regNo?: unknown
) {
  const auth = findGroupAndStudent(groupId, regNo);
  if (auth.error) return auth.error;
  const { student } = auth;

  if (!materialId || !/^[0-9a-f-]{36}$/i.test(materialId)) {
    return { status: 400, body: { error: "Invalid material id." } };
  }

  const existing = await withClient(async (c) => {
    const res = await c.query<MaterialRow>(
      "SELECT * FROM group_materials WHERE id = $1 AND group_id = $2",
      [materialId, groupId]
    );
    return res.rows[0] ?? null;
  });

  if (!existing) {
    return { status: 404, body: { error: "Material not found." } };
  }

  if (Number(existing.student_sn) !== student.sn) {
    return {
      status: 403,
      body: { error: "You can only delete materials that you uploaded." },
    };
  }

  if (existing.kind === "file" && existing.storage_path) {
    await deleteStorageObject(existing.storage_path);
  }

  await withClient(async (c) => {
    await c.query("DELETE FROM group_materials WHERE id = $1 AND group_id = $2", [
      materialId,
      groupId,
    ]);
  });

  return { status: 200, body: { ok: true } };
}
