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
- Workspaces and team members (add by e-mail, remove, leave)
- Boards with default columns; rename and delete boards
- Add, rename, delete and drag columns to reorder them
- Create, edit, delete tasks; drag and drop between columns
- Task description, priority, due date, assignee, comments
- Search and filters (priority, assignee)
- The board refreshes every 6 seconds, so teammates see each other's changes

## Project structure

```
backend/
  src/server.js        entry point, CORS, routes
  src/db.js            PostgreSQL connection
  src/schema.sql       tables (created automatically on start)
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

You need Node 18+ and a PostgreSQL database.

```bash
# 1. Backend
cd backend
cp .env.example .env      # fill DATABASE_URL and JWT_SECRET
npm install
npm run dev               # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev               # http://localhost:3000
```

## Deploy (in this order)

### 1. Supabase (database)
1. Create a project and remember the database password.
2. Click **Connect** -> **Session pooler** and copy the connection string
   (replace `[YOUR-PASSWORD]`). Use the pooler, not the "Direct connection":
   Render needs IPv4 and the direct host is IPv6-only.
3. No manual SQL is needed. Tables are created when the backend starts.

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
