# CPE 411 — Groupings (React + Express + Supabase/Postgres)

Web app for CPE 411 groups: select a group (`/group1`–`/group9`), view members, pick each student’s subtopic and role, and share group materials (slide decks, PDFs, documents, images, and external links) organized by subtopic. Selections and material metadata are stored in Postgres (Supabase), and uploaded files are stored in Supabase Storage via signed URLs.

## Data
- Groups/students: `src/data/groups.ts` (from the provided grouping sheet)
- Topics/subtopics per group: `src/data/topics.ts` (from the provided course outline; DIY excluded)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and configure your Supabase credentials:
   ```env
   # Postgres connection string (Database -> Connection string)
   DB_URI=postgresql://USER:PASSWORD@HOST:PORT/postgres
   PORT=3000
   PG_POOL_MAX=5

   # Supabase Project API (Project Settings -> API) for file uploads
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_STORAGE_BUCKET=group-materials
   ```
   - `DB_URI` is your **Postgres** connection string (`postgresql://...`) used for database tables (`group_selections` and `group_materials`).
   - `SUPABASE_URL` is your **Supabase Project HTTPS URL** (`https://<project-ref>.supabase.co` from **Project Settings → Data API**).
   - `SUPABASE_SERVICE_ROLE_KEY` is your **Secret key** (`sb_secret_...` under **Project Settings → API Keys → Secret keys**, or the legacy `service_role` key)—never use the Publishable key here.
   - SSL is enabled automatically for external Postgres connections unless `DB_URI` contains `sslmode=disable` or points to localhost.
   - External links (`Add link`) work even if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are not set; file uploads require both.
3. Ensure the schema exists:
   ```bash
   npm run db:seed
   ```

## Run
- Development (two terminals):
  ```bash
  npm run dev:server   # API/server on http://localhost:3000
  npm run dev          # Vite dev server, proxies /api to :3000
  ```
- Production:
  ```bash
  npm run build
  npm start            # serves API + built frontend on PORT
  ```

## API
- `GET /api/groups/:id/selections` — selections for a group
- `POST /api/groups/:id/selections` — upsert `{ studentSn, subtopicIndex, roleId, regNo }`
- `GET /api/groups/:id/materials` — list group materials with signed preview/download URLs
- `POST /api/groups/:id/materials/upload-url` — request a signed Supabase Storage upload URL (`{ regNo, subtopicIndex, fileName, mimeType, sizeBytes }`, max 25 MB)
- `POST /api/groups/:id/materials` — save uploaded file metadata or an external link (`{ regNo, kind, subtopicIndex, title, note?, ... }`)
- `DELETE /api/groups/:id/materials/:materialId` — delete a material (uploader only; `{ regNo }`)

## Notes
- Selections are saved in `group_selections` and materials metadata in `group_materials` (created automatically on server/API startup).
- Uploaded files are stored in a private Supabase Storage bucket (`SUPABASE_STORAGE_BUCKET`, default `group-materials`), which the server auto-creates if missing.
- Supported file types: `.pdf`, `.ppt`, `.pptx`, `.doc`, `.docx`, `.key`, `.odp`, `.odt`, `.png`, `.jpg`, `.jpeg`, `.webp` (max 25 MB).
- SPA routes like `/group1` are served by the Express server in production; on Vercel, `vercel.json` rewrites non-`/api/` routes to `index.html`.
