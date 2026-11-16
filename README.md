# CPE 411 — Group 1 Presentation & Project Grouping

Simple React + Express app with a Postgres database (Render-compatible) for 37 students to pick subtopics and roles.

## Rules
- 5 subtopics, each with **1 Presenter, 3 Researchers, 3 Slide Creators** (35 seats total).
- Students are shown in a table sorted by **registration number**.
- Name + registration number must match the roster. Matching ignores case, spacing, punctuation, and name order.
- Seats are first-come, first-served. If all 35 are taken, remaining students see that no seats are available (but can claim a seat if one is released).
- Students can change to another free seat or release their seat (with confirmation). Selections stay open.

## Subtopics
- **a. Definition & Characteristics** — Definition and characteristics of embedded systems.
- **b. MPU vs. MCU** — Classification: Microprocessors (MPU) vs. Microcontrollers (MCU).
- **c. Application Domains** — Consumer electronics, automotive, industrial automation, IoT, and medical devices.
- **d. Design Flow** — Specification → Design → Implementation → Testing.
- **e. General-Purpose vs. Embedded** — Guardrail: Differentiate clearly between general-purpose computing (PCs) and embedded computing constraints (power, cost, real-time).

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set your Render Postgres URL:
   ```env
   DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME
   PORT=3000
   ```
   For Render external connections, SSL is enabled automatically (with `rejectUnauthorized: false`) unless the URL contains `sslmode=disable` or points to localhost.
3. Ensure the schema/table exists:
   ```bash
   npm run db:seed
   ```

## Run
- Development (recommended): run API and frontend in two terminals
  ```bash
  npm run dev:server   # http://localhost:3000 (API + serves dist if built)
  npm run dev          # Vite dev server, proxies /api to :3000
  ```
- Production:
  ```bash
  npm run build
  npm start            # serves API and built frontend on PORT
  ```

## Scripts
- `npm run db:seed` — create the `selections` table if missing.
- `npm run db:reset -- --confirm` — clear all selections.
- `npm run db:export` — export `selections-export.csv` (sorted by registration number).

## Notes
- Student names and subtopics are defined in `src/data/students.ts` and `src/data/subtopics.ts`.
- Identification is by name + reg number only (no authentication). The page is public to anyone with the link and marked `noindex`.
- Deploy anywhere you can run a Node server with access to the Render Postgres database (set `DATABASE_URL` and `PORT`). Build with `npm run build` and run with `npm start`.
