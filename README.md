# GlassKanban

A Trello-style kanban app with a glassmorphism design.
Users register, create workspaces, invite team members, and work together on boards
with columns and tasks. Everything is stored in PostgreSQL.

| Part     | Tech                         | Hosting  |
|----------|------------------------------|----------|
| Frontend | Next.js 14 (App Router)      | Vercel   |
| Backend  | Node.js + Express (REST API) | Render   |
| Database | PostgreSQL                   | Supabase |

## Features

- Register / login (JWT, passwords hashed with bcrypt)
- Workspaces with project description, goal, category, and dates; team members (invite by e-mail, remove, leave)
- Boards with default columns; rename and delete boards
- Add, rename, delete and drag columns to reorder them
- Create, edit, delete tasks; drag and drop between columns
- Task description, priority, due date, assignee, comments
- Search and filters (priority, assignee); press `/` to jump to search
- Styled pop-up dialogs for delete/leave confirmations and toast notifications (no browser alerts)
- Instant (optimistic) UI updates; the board still refreshes every 6 seconds, so teammates see each other's changes
- Task window: priority buttons, due-date shortcuts (today / tomorrow / 1 week), "assign to me", move to another column, Ctrl+Enter to save
- Overdue / due-soon highlighting, task count and completion progress (last column counts as "done")
- Board background picker (saved per board in this device's browser)
- Skeleton loading screens and a hint when the free Render server is waking up

## Project structure

```
backend/
  src/server.js        entry point, CORS, routes
  src/db.js            PostgreSQL connection
  src/schema.sql       base tables (apply once in the Supabase SQL editor)
  src/access.js        "may this user touch this board/task?" checks
  src/order.js         keeps column/task order correct
  src/middleware/auth.js
  src/routes/          auth, workspaces, boards, columns, tasks, comments
frontend/
  app/                 pages: / (dashboard), /login, /register, /board/[id]
  components/          Header, Modal, Column, TaskCard, TaskModal, ...
  lib/                 api.js (fetch helper), auth.js, format.js
  app/globals.css      the glass design
```

## Run locally

You need Node 18+ and a Supabase PostgreSQL project. The frontend and API run on your
computer; the API connects to Supabase.

1. In Supabase, open **Connect → Session pooler** and copy the connection URL (port
   `5432`). Do not use a Transaction pooler URL for migrations.
2. In PowerShell, configure and start the backend:

   ```powershell
   Set-Location backend
   if (!(Test-Path .env)) { New-Item -ItemType File .env | Out-Null }
   notepad .env
   ```

   Set `DATABASE_URL` to the Supabase Session pooler URL, set a long random
   `JWT_SECRET`, and keep `http://localhost:3000` in `CLIENT_URL`. Add your future
   Vercel URL to the comma-separated `CLIENT_URL` value. Do not commit `.env`. Then run:

   ```powershell
   npm install
   npm run dev
   ```

   The API is at `http://localhost:5000`. The backend checks migrations at startup
   but does not apply them automatically. For a new Supabase project, first apply
   `backend/src/schema.sql` in the Supabase SQL editor. Then run
   `npm run migrate -- --status` and, after checking the pending migrations,
   `npm run migrate -- --yes`.
3. In a second PowerShell terminal, start the frontend:

   ```powershell
   Set-Location frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`. The frontend defaults to the local API at
   `http://localhost:5000`.

## Deploy (in this order)

### 1. Supabase (database)
1. Create a project and remember the database password.
2. Click **Connect** -> **Session pooler** and copy the connection string
   (replace `[YOUR-PASSWORD]`). Use the pooler, not the "Direct connection":
   Render needs IPv4 and the direct host is IPv6-only.
3. Before starting the backend on a new database, apply `backend/src/schema.sql`
   once in the Supabase SQL editor to create the base tables. From `backend/`,
   run `npm run migrate -- --status`, review the pending migration names, then run
   `npm run migrate -- --yes`. The server checks migrations at startup but does
   not apply them automatically.

### 2. Render (backend)
1. **New -> Web Service**, connect the GitHub repo.
2. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
3. Environment variables:
   - `DATABASE_URL` = the Supabase pooler string
   - `JWT_SECRET` = a long random string (e.g. `openssl rand -hex 32`)
   - `CLIENT_URL` = `https://glass-kanban-iota.vercel.app`
4. Deploy and copy the URL, e.g. `https://glasskanban-api.onrender.com`.
   Test: open `<that-url>/api/health` -> `{"status":"ok"}`.

### 3. Vercel (frontend)
1. Open the existing project -> **Settings -> General -> Root Directory** -> `frontend`.
   Framework Preset should be **Next.js**.
2. **Settings -> Environment Variables**:
   `NEXT_PUBLIC_API_URL` = the Render URL (no trailing slash).
3. Redeploy (Deployments -> ... -> Redeploy). The variable is read at build time,
   so a redeploy is required after changing it.

### 4. First test
Open the Vercel URL, register two accounts (one in a private window), add the second
account to the first one's workspace via **Üzvlər**, and open the same board in both.

## Good to know

- **Render free plan sleeps** after ~15 minutes without traffic. The first request after
  that can take 30-60 seconds. The app shows an error message if it can't connect yet;
  just retry.
- **Supabase free plan pauses** projects after a week of inactivity. Restore it from the dashboard.
- If you use a custom Vercel domain, add it to `CLIENT_URL` (comma-separated).
- Row Level Security is enabled on all tables with no policies. This blocks Supabase's own
  public REST API from reading your data. The Express backend connects as the `postgres`
  role and is not affected.
