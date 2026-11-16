# CPE 411 — Groupings (React + Express + Supabase/Postgres)

Web app for CPE 411 groups: select a group (`/group1`–`/group9`), view members, and pick each student’s subtopic and role. Selections are stored in Postgres (Supabase).

## Data
- Groups/students: `src/data/groups.ts` (from the provided grouping sheet)
- Topics/subtopics per group: `src/data/topics.ts` (from the provided course outline; DIY excluded)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set your Supabase connection string:
   ```env
   DB_URI=postgresql://USER:PASSWORD@HOST:PORT/postgres
   PORT=3000
   ```
   SSL is enabled automatically for external connections unless the URI contains `sslmode=disable` or points to localhost.
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
- `POST /api/groups/:id/selections` — upsert `{ studentSn, subtopicIndex, roleId }`

## Notes
- Selections are saved in table `group_selections` (created by `db:seed`/server startup).
- SPA routes like `/group1` are served by the Express server in production; if deploying the frontend as static-only, configure rewrites to `index.html`.
