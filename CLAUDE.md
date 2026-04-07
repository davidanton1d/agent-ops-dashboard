# Agent Ops Dashboard

Local observability dashboard for monitoring Claude Code agent sessions across WSL terminals.

## Stack
- Backend: Hono + Drizzle ORM + better-sqlite3
- Frontend: Vue 3 + PrimeVue 4 + Vite
- Database: SQLite at data/agent-ops.db

## Dev
- `npm run dev` — starts backend (3100) + frontend (5173)
- Backend: `backend/src/index.js` entry point
- Frontend: `frontend/src/main.js` entry point
- Scanner: `backend/src/scanner/index.js` — runs every 15s

## Structure
- `backend/database/schema/` — Drizzle schema (work_items, agent_runs, events)
- `backend/src/routes/` — Hono route modules
- `backend/src/scanner/` — Claude Code session log scanner
- `frontend/src/views/` — MissionControl, WorkItemDetail, AgentRunDetail
- `frontend/src/components/` — KanbanBoard, WorkItemCard, EventTimeline, AgentRunBadge
