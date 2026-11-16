# Group Materials Upload — Design & Technical Specification

**Branch:** `feat/group-materials` (branched from `ui-revamp`)  
**Status:** Ready for review & implementation  
**Design System:** [DESIGN.md](../DESIGN.md)

---

## 1. Overview & Goals
Allow students in **CPE 411 — Groupings** to share and discover presentation materials (slide decks, PDFs, documents, diagrams, and external links) for their assigned group, organized by subtopic and optimized for mobile-first usage.

### Key Decisions
| Area | Decision |
| :--- | :--- |
| **Base Branch** | `ui-revamp` |
| **Storage Backend** | Supabase Storage via server-generated signed upload & download URLs |
| **Supabase Auth** | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (+ optional `SUPABASE_STORAGE_BUCKET`, default `group-materials`); server auto-creates private bucket if missing |
| **Permissions** | Group members can upload to their own group and delete only their own uploads; all logged-in students can view, preview, and download materials in any group |
| **Supported Files** | `.pdf`, `.ppt`, `.pptx`, `.doc`, `.docx`, `.key`, `.odp`, `.odt`, `.png`, `.jpg`, `.jpeg`, `.webp` (max **25 MB** per file) |
| **External Links** | Supported alongside files (`https://...` URLs for Google Slides, Canva, Google Drive, OneDrive, Figma, etc.) |
| **Organization** | **Required** `subtopicIndex` (`0..N-1`) on every file or link, plus a display title and optional short note |
| **Viewing** | Inline modal/drawer preview for **PDFs** and **images**; direct download for Office/Keynote files; open-in-new-tab for external links |
| **UI Placement** | 3rd tab **Materials** (with item count) on `GroupPage`, plus linked material chips inside each card on the **Subtopic Breakdown** tab |

---

## 2. Architecture & Data Flow

### 2.1 Why Signed Upload URLs
Because the app deploys to **Vercel Serverless Functions**, API request payloads are capped at 4.5 MB and local disk is ephemeral. Using Supabase Storage signed upload URLs lets the browser upload files up to **25 MB** directly to Supabase Storage without passing file bytes through Vercel functions.

### 2.2 Database Schema (`group_materials`)
Added to `ensureSchema()` in both `api/` and `server/db.ts`:

```sql
CREATE TABLE IF NOT EXISTS group_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id INTEGER NOT NULL,
  student_sn INTEGER NOT NULL,
  uploader_name TEXT NOT NULL,
  uploader_reg_no TEXT NOT NULL,
  subtopic_index INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('file', 'link')),
  title TEXT NOT NULL,
  note TEXT,
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  external_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_materials_group
  ON group_materials(group_id, created_at DESC);
```

### 2.3 Environment Variables
Add to `.env.example` and Vercel/local `.env`:
- `SUPABASE_URL` — Project URL (e.g. `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, never exposed to browser)
- `SUPABASE_STORAGE_BUCKET` — Optional, defaults to `group-materials`

We will use `@supabase/supabase-js` on the server (or direct Supabase Storage REST calls with `fetch` + `SUPABASE_SERVICE_ROLE_KEY` to keep the serverless bundle tiny and dependency-free). Using native `fetch` against Supabase Storage REST endpoints (`/storage/v1/bucket`, `/storage/v1/object/upload/sign/...`, `/storage/v1/object/sign/...`) avoids adding heavy SDK overhead and works identically in Node 20+/Express and Vercel serverless.

---

## 3. API Endpoints

All routes are implemented for both **Vercel (`api/groups/[id]/materials...`)** and **Express (`server/index.ts`)**:

1. **`GET /api/groups/:id/materials`**
   - Lists all materials for `groupId` ordered by `created_at DESC`.
   - For `kind === 'file'`, generates short-lived signed URLs (e.g. `3600s` expiry) for `previewUrl` (inline) and `downloadUrl` (`download=fileName`), so private bucket access remains secure.
   - Returns `{ materials: MaterialItem[] }`.

2. **`POST /api/groups/:id/materials/upload-url`**
   - Body: `{ regNo, subtopicIndex, fileName, mimeType, sizeBytes }`
   - Validates:
     - `regNo` belongs to `groupId` (returns `403` if student is in another group).
     - `subtopicIndex` is a valid integer `0 <= idx < topic.subtopics.length`.
     - File extension & MIME type are in the allowlist.
     - `0 < sizeBytes <= 25 * 1024 * 1024` (25 MB).
   - Ensures the Supabase Storage bucket exists (auto-creates private bucket with `file_size_limit: 26214400` if missing).
   - Generates a unique object path: `group-${groupId}/subtopic-${subtopicIndex + 1}/${uuid}-${sanitizedFileName}`.
   - Requests a signed upload URL from Supabase Storage (`POST /storage/v1/object/upload/sign/{bucket}/{path}`) and returns `{ signedUrl, token, storagePath }`.

3. **`POST /api/groups/:id/materials`**
   - Finalizes a file upload **or** creates an external link entry.
   - Body for file: `{ regNo, kind: "file", subtopicIndex, title, note?, storagePath, fileName, mimeType, sizeBytes }`
   - Body for link: `{ regNo, kind: "link", subtopicIndex, title, note?, externalUrl }`
   - Validates `regNo` belongs to `groupId`, `subtopicIndex` is valid, `title` is non-empty (max 140 chars), `note` (max 300 chars), and for links `externalUrl` is a valid `http:`/`https:` URL.
   - Inserts row into `group_materials` and returns `{ material }` with signed URLs if `kind === 'file'`.

4. **`DELETE /api/groups/:id/materials/:materialId`**
   - Body or query: `{ regNo }`
   - Verifies `regNo` belongs to `groupId` AND `row.student_sn === student.sn` (owners only; returns `403` otherwise).
   - If `kind === 'file'` and `storage_path` is set, deletes the object from Supabase Storage (`DELETE /storage/v1/object/{bucket}/{path}`), then deletes the row from `group_materials`.
   - Returns `{ ok: true }`.

---

## 4. UI & UX Design (Mobile-First, `DESIGN.md` Compliant)

### 4.1 Group Page Navigation
- **Segmented Tab Bar** on `GroupPage` expands from 2 tabs to 3 tabs:
  1. `Student Roster`
  2. `Subtopic Breakdown`
  3. `Materials (N)` — displays live material count.
- On mobile (`< 768px`), tabs wrap or scroll cleanly without horizontal page overflow, maintaining minimum `44px` touch targets.

### 4.2 Materials Tab
- **Add Material Card** (visible only when `isMyGroup === true`; read-only groups see a subtle `cloud` notice):
  - Mode toggle: **Upload File** | **Add Link**
  - **Subtopic** (required): Uses the custom `Select` component (`Subtopic 1..N` with full description). Defaults to the logged-in student's selected subtopic if they have one.
  - **Title** (`Input`): Auto-populates from the selected filename (editable) or entered manually for links.
  - **File Dropzone / Picker** (in Upload File mode): Tap-friendly dashed `paper` zone showing allowed formats and `25 MB max`, with progress bar during upload.
  - **URL** (`Input`, in Add Link mode): `type="url"`, `inputMode="url"`, placeholder `https://docs.google.com/...`.
  - **Optional Note** (`Input`): Short context (e.g., *"Updated speaker notes v2"*).
  - **Submit Button** (`Button variant="primary"`): Explicit `"Upload material"` / `"Add link"` button; triggers success/error `Toast`.
- **Materials List & Filter**:
  - Filter pills: `All` + `Subtopic 1..N` (only showing subtopics or quick filter) + search `Input`.
  - Grouped or flat cards showing:
    - File-type or Link icon badge (`PDF`, `SLIDES`, `DOC`, `IMAGE`, `LINK`) using pastel accent tags (`--color-tag-violet`, `--color-tag-blue`, `--color-tag-green`).
    - **Title**, **Subtopic N** badge, optional note, uploader name + reg no, file size (formatted in `DM Mono`, e.g., `4.2 MB`), and relative/short date.
    - Actions:
      - **Preview** button for PDFs and images (opens clean centered preview modal with `<iframe>` / `<img>` + download button).
      - **Download** button for all files / **Open link** (`target="_blank" rel="noopener noreferrer"`) for external links.
      - **Delete** button (with inline confirmation or 1-tap confirm) shown **only** when `material.studentSn === session.studentSn`.

### 4.3 Subtopic Breakdown Integration
- Inside each card on the **Subtopic Breakdown** tab, add a compact **Materials** footer section listing materials tagged to that subtopic as clickable chips/rows (opening preview/link or jumping to the Materials tab).

---

## 5. Error Handling & Edge Cases
- **Missing Supabase env vars**: Return `503` with clear message (`"File storage is not configured on the server"`); external links (`kind: "link"`) still work even if Supabase Storage env vars are not yet set!
- **Oversized or disallowed file**: Validated client-side immediately (with error `Toast` + inline message) AND server-side before issuing a signed URL.
- **Orphaned storage cleanup**: If database insert fails after direct upload to Supabase Storage, the server/client attempts cleanup or returns a clear retryable error.
- **Mobile Safari / Android Chrome**: File `<input type="file">` uses explicit `accept` attribute, `16px` input font sizes, and `44px`+ touch targets.
