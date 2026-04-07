# Agent Ops Dashboard

Local dashboard for monitoring Claude Code agent sessions running across multiple WSL terminals.

## Quick Start

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
mkdir -p data
npm run dev:backend   # http://localhost:3100
npm run dev:frontend  # http://localhost:5173
```

## What It Does

- Scans `~/.claude/projects/` for active Claude Code sessions
- Auto-links agent runs to Freshservice tickets via INC pattern matching
- Shows all work items in a Kanban board (Todo / In Progress / Blocked / Done)
- Displays event timeline for each work item
- Flags unlinked agents as "Rogue"
