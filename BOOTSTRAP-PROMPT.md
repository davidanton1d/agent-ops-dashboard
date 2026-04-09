# Agent Ops Dashboard — Complete Build Prompt

Paste this entire prompt into Claude Code on a fresh machine. It will build the complete project.

---

Build the "Agent Ops Dashboard" — a local observability dashboard that monitors all Claude Code agent sessions running across terminals. It scans `~/.claude/projects/` for JSONL session files, auto-links to Freshservice tickets, and shows everything in a Kanban board.

**Prerequisites:** Node.js 22+, no Docker needed for dev.

## Stack
- Backend: Hono + Drizzle ORM + better-sqlite3 + ulid
- Frontend: Vue 3 + PrimeVue 4 (Aura theme) + Vite
- Database: SQLite at `data/agent-ops.db`
- Single process: API + scanner + static frontend serving
- No auth, no Redis, no external services

## Project Structure

```
agent-ops-dashboard/
├── backend/
│   ├── database/
│   │   ├── schema/
│   │   │   └── index.js
│   │   └── migrations/
│   ├── src/
│   │   ├── core/
│   │   │   ├── db.js
│   │   │   ├── env.js
│   │   │   └── migrate.js
│   │   ├── routes/
│   │   │   ├── work-items.js
│   │   │   ├── agent-runs.js
│   │   │   ├── events.js
│   │   │   └── enrich.js
│   │   ├── scanner/
│   │   │   ├── index.js
│   │   │   └── patterns.js
│   │   └── index.js
│   ├── drizzle.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/main.css
│   │   ├── components/
│   │   │   ├── AgentRunBadge.vue
│   │   │   ├── EventTimeline.vue
│   │   │   ├── KanbanBoard.vue
│   │   │   └── WorkItemCard.vue
│   │   ├── composables/useApi.js
│   │   ├── router/index.js
│   │   ├── views/
│   │   │   ├── AgentRunDetail.vue
│   │   │   ├── MissionControl.vue
│   │   │   └── WorkItemDetail.vue
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── data/
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
├── CLAUDE.md
└── README.md
```

## Build Steps

### 1. Scaffold

```bash
mkdir -p agent-ops-dashboard && cd agent-ops-dashboard
git init && mkdir -p data
```

### 2. Install Dependencies

Root `package.json`:
```json
{
  "name": "agent-ops-dashboard",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev"
  }
}
```

Backend `backend/package.json`:
```json
{
  "name": "agent-ops-dashboard-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "node src/core/migrate.js"
  }
}
```

Frontend `frontend/package.json`:
```json
{
  "name": "agent-ops-dashboard-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

```bash
npm install -D concurrently
cd backend && npm install hono @hono/node-server drizzle-orm better-sqlite3 ulid && npm install -D drizzle-kit
cd ../frontend && npm install vue vue-router pinia primevue @primevue/themes primeicons && npm install -D vite @vitejs/plugin-vue
cd ..
```

### 3. Create All Files

Create every file below with the EXACT content shown. Do NOT add anything extra.

---

#### `.gitignore`
```
node_modules/
dist/
data/*.db
data/*.db-wal
data/*.db-shm
.env
```

#### `backend/database/schema/index.js`
```js
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const workItems = sqliteTable('work_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  source: text('source').notNull().default('manual'),
  externalId: text('external_id'),
  status: text('status').notNull().default('todo'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const agentRuns = sqliteTable('agent_runs', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').references(() => workItems.id),
  sessionId: text('session_id').notNull().unique(),
  projectPath: text('project_path'),
  status: text('status').notNull().default('running'),
  lastOutput: text('last_output'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').references(() => workItems.id),
  agentRunId: text('agent_run_id').references(() => agentRuns.id),
  type: text('type').notNull(),
  message: text('message').notNull(),
  metadata: text('metadata'),
  timestamp: integer('timestamp').notNull(),
})
```

#### `backend/src/core/db.js`
```js
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../database/schema/index.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = resolve(__dirname, '../../../data/agent-ops.db')

mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
```

#### `backend/src/core/env.js`
```js
export const PORT = process.env.PORT || 3100
export const CLAUDE_DIR = process.env.CLAUDE_DIR || `${process.env.HOME}/.claude`
export const SCAN_INTERVAL = process.env.SCAN_INTERVAL || 15000
```

#### `backend/src/core/migrate.js`
```js
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './db.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
migrate(db, { migrationsFolder: resolve(__dirname, '../../database/migrations') })
console.log('Migrations applied.')
```

#### `backend/drizzle.config.js`
```js
export default {
  schema: './database/schema/index.js',
  out: './database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '../data/agent-ops.db',
  },
}
```

#### `backend/src/routes/work-items.js`
```js
import { Hono } from 'hono'
import { db } from '../core/db.js'
import { workItems, agentRuns, events } from '../../database/schema/index.js'
import { eq, desc } from 'drizzle-orm'
import { ulid } from 'ulid'

const app = new Hono()

app.get('/', async (c) => {
  const items = await db.select().from(workItems).orderBy(desc(workItems.updatedAt))
  const result = await Promise.all(items.map(async (item) => {
    const runs = await db.select().from(agentRuns).where(eq(agentRuns.workItemId, item.id))
    const latestEvent = await db.select().from(events)
      .where(eq(events.workItemId, item.id))
      .orderBy(desc(events.timestamp))
      .limit(1)
    return { ...item, agentRuns: runs, latestEvent: latestEvent[0] || null }
  }))
  return c.json(result)
})

app.get('/:id', async (c) => {
  const { id } = c.req.param()
  const item = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1)
  if (!item[0]) return c.json({ error: 'Not found' }, 404)
  const runs = await db.select().from(agentRuns).where(eq(agentRuns.workItemId, id))
  const itemEvents = await db.select().from(events)
    .where(eq(events.workItemId, id))
    .orderBy(desc(events.timestamp))
  return c.json({ ...item[0], agentRuns: runs, events: itemEvents })
})

app.post('/', async (c) => {
  const body = await c.req.json()
  const now = Date.now()
  const item = {
    id: ulid(),
    title: body.title,
    source: body.source || 'manual',
    externalId: body.externalId || null,
    status: body.status || 'todo',
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(workItems).values(item)
  return c.json(item, 201)
})

app.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  await db.update(workItems)
    .set({ ...body, updatedAt: Date.now() })
    .where(eq(workItems.id, id))
  const updated = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1)
  return c.json(updated[0])
})

app.get('/:id/events', async (c) => {
  const { id } = c.req.param()
  const itemEvents = await db.select().from(events)
    .where(eq(events.workItemId, id))
    .orderBy(desc(events.timestamp))
  return c.json(itemEvents)
})

export default app
```

#### `backend/src/routes/agent-runs.js`
```js
import { Hono } from 'hono'
import { db } from '../core/db.js'
import { agentRuns, events } from '../../database/schema/index.js'
import { eq, desc } from 'drizzle-orm'

const app = new Hono()

app.get('/', async (c) => {
  const { status, rogue } = c.req.query()
  const runs = await db.select().from(agentRuns).orderBy(desc(agentRuns.updatedAt))
  let result = runs
  if (status) result = result.filter(r => r.status === status)
  if (rogue === 'true') result = result.filter(r => r.workItemId === null)
  return c.json(result)
})

app.get('/:id', async (c) => {
  const { id } = c.req.param()
  const run = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1)
  if (!run[0]) return c.json({ error: 'Not found' }, 404)
  return c.json(run[0])
})

app.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  await db.update(agentRuns)
    .set({ workItemId: body.workItemId, updatedAt: Date.now() })
    .where(eq(agentRuns.id, id))
  const updated = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1)
  return c.json(updated[0])
})

app.get('/:id/events', async (c) => {
  const { id } = c.req.param()
  const runEvents = await db.select().from(events)
    .where(eq(events.agentRunId, id))
    .orderBy(desc(events.timestamp))
  return c.json(runEvents)
})

export default app
```

#### `backend/src/routes/events.js`
```js
import { Hono } from 'hono'
import { db } from '../core/db.js'
import { events } from '../../database/schema/index.js'
import { ulid } from 'ulid'

const app = new Hono()

app.post('/', async (c) => {
  const body = await c.req.json()
  const event = {
    id: ulid(),
    workItemId: body.workItemId || null,
    agentRunId: body.agentRunId || null,
    type: body.type,
    message: body.message,
    metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    timestamp: Date.now(),
  }
  await db.insert(events).values(event)
  return c.json(event, 201)
})

export default app
```

#### `backend/src/routes/enrich.js`
```js
import { Hono } from 'hono'

const app = new Hono()

app.get('/freshservice/:incId', async (c) => {
  const { incId } = c.req.param()
  return c.json({
    incId,
    enriched: false,
    message: `Freshservice enrichment for INC-${incId} not yet connected.`,
  })
})

app.get('/devops/:identifier', async (c) => {
  const { identifier } = c.req.param()
  return c.json({
    identifier,
    enriched: false,
    message: `Azure DevOps enrichment for ${identifier} not yet connected.`,
  })
})

export default app
```

#### `backend/src/scanner/patterns.js`
```js
const FS_TICKET_RE = /\/fs-ticket\s+(\d+)/i
const INC_RE = /(?:#?INC-)(\d{4,6})/i

export function extractTicketId(text) {
  const fsMatch = text.match(FS_TICKET_RE)
  if (fsMatch) return fsMatch[1]
  const incMatch = text.match(INC_RE)
  if (incMatch) return incMatch[1]
  return null
}

export function extractToolUses(messageContent) {
  if (!Array.isArray(messageContent)) return []
  return messageContent
    .filter(block => block.type === 'tool_use')
    .map(block => block.name)
}
```

#### `backend/src/scanner/index.js`
```js
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { db } from '../core/db.js'
import { agentRuns, events, workItems } from '../../database/schema/index.js'
import { eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { CLAUDE_DIR, SCAN_INTERVAL } from '../core/env.js'
import { extractTicketId, extractToolUses } from './patterns.js'

const IDLE_THRESHOLD_MS = 2 * 60 * 1000
const fileCursors = new Map()

export function startScanner() {
  console.log(`Scanner started — interval ${SCAN_INTERVAL}ms, watching ${CLAUDE_DIR}/projects/`)
  setTimeout(() => scan(), 100)
  return setInterval(scan, SCAN_INTERVAL)
}

export function scan() {
  const projectsDir = join(CLAUDE_DIR, 'projects')
  let projectDirs
  try { projectDirs = readdirSync(projectsDir) } catch { return }

  const now = Date.now()

  for (const projectSlug of projectDirs) {
    const projectPath = join(projectsDir, projectSlug)
    let entries
    try {
      const stat = statSync(projectPath)
      if (!stat.isDirectory()) continue
      entries = readdirSync(projectPath)
    } catch { continue }

    for (const file of entries.filter(f => f.endsWith('.jsonl'))) {
      const sessionId = file.replace('.jsonl', '')
      try {
        processSession(sessionId, join(projectPath, file), projectSlug, now)
      } catch (err) {
        console.error(`Scanner error for ${sessionId}:`, err.message)
      }
    }
  }

  markStaleSessionsCompleted(now)
}

function processSession(sessionId, filePath, projectSlug, now) {
  const existing = db.select().from(agentRuns)
    .where(eq(agentRuns.sessionId, sessionId)).limit(1).get()

  const cursorKey = `${projectSlug}/${sessionId}`
  const lineCursor = fileCursors.get(cursorKey) || 0

  const content = readFileSync(filePath, 'utf-8')
  const allLines = content.split('\n').filter(Boolean)

  if (lineCursor >= allLines.length && existing) return

  const newLines = allLines.slice(lineCursor)
  fileCursors.set(cursorKey, allLines.length)

  let cwd = null
  let ticketId = null
  const toolUseNames = []

  for (const line of newLines) {
    let parsed
    try { parsed = JSON.parse(line) } catch { continue }

    if (!cwd && parsed.cwd) cwd = parsed.cwd

    if (parsed.type === 'user' && parsed.message?.content) {
      const text = typeof parsed.message.content === 'string' ? parsed.message.content : ''
      if (!ticketId) ticketId = extractTicketId(text)
    }

    if (parsed.type === 'assistant' && parsed.message?.content) {
      toolUseNames.push(...extractToolUses(parsed.message.content))
    }
  }

  if (!existing) {
    const agentRun = {
      id: ulid(), workItemId: null, sessionId,
      projectPath: cwd || '/' + projectSlug.replace(/-/g, '/'),
      status: 'running', lastOutput: null, createdAt: now, updatedAt: now,
    }
    db.insert(agentRuns).values(agentRun).run()
    db.insert(events).values({
      id: ulid(), workItemId: null, agentRunId: agentRun.id,
      type: 'agent_start', message: `Agent session started in ${agentRun.projectPath}`,
      metadata: JSON.stringify({ sessionId, projectSlug }), timestamp: now,
    }).run()
    if (ticketId) linkToTicket(agentRun.id, ticketId, now)
  } else {
    db.update(agentRuns).set({ updatedAt: now, projectPath: cwd || existing.projectPath })
      .where(eq(agentRuns.id, existing.id)).run()
    if (ticketId && !existing.workItemId) linkToTicket(existing.id, ticketId, now)
    for (const toolName of toolUseNames) {
      db.insert(events).values({
        id: ulid(), workItemId: existing.workItemId, agentRunId: existing.id,
        type: 'tool_use', message: `Used tool: ${toolName}`,
        metadata: JSON.stringify({ tool: toolName }), timestamp: now,
      }).run()
    }
  }
}

function linkToTicket(agentRunId, ticketId, now) {
  const externalId = `INC-${ticketId}`
  let workItem = db.select().from(workItems)
    .where(eq(workItems.externalId, externalId)).limit(1).get()

  if (!workItem) {
    workItem = {
      id: ulid(), title: `Freshservice ${externalId}`, source: 'auto',
      externalId, status: 'in_progress', createdAt: now, updatedAt: now,
    }
    db.insert(workItems).values(workItem).run()
  }

  db.update(agentRuns).set({ workItemId: workItem.id, updatedAt: now })
    .where(eq(agentRuns.id, agentRunId)).run()
  db.insert(events).values({
    id: ulid(), workItemId: workItem.id, agentRunId,
    type: 'manual', message: `Auto-linked to ${externalId}`,
    metadata: JSON.stringify({ ticketId, externalId }), timestamp: now,
  }).run()
}

function markStaleSessionsCompleted(now) {
  const running = db.select().from(agentRuns).where(eq(agentRuns.status, 'running')).all()
  for (const run of running) {
    if (now - run.updatedAt > IDLE_THRESHOLD_MS) {
      db.update(agentRuns).set({ status: 'completed', updatedAt: now })
        .where(eq(agentRuns.id, run.id)).run()
      db.insert(events).values({
        id: ulid(), workItemId: run.workItemId, agentRunId: run.id,
        type: 'agent_stop', message: 'Agent session completed (idle timeout)',
        metadata: null, timestamp: now,
      }).run()
    }
  }
}
```

#### `backend/src/index.js`
```js
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { cors } from 'hono/cors'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PORT } from './core/env.js'
import workItemRoutes from './routes/work-items.js'
import agentRunRoutes from './routes/agent-runs.js'
import eventRoutes from './routes/events.js'
import enrichRoutes from './routes/enrich.js'
import { startScanner, scan } from './scanner/index.js'
import { SCAN_INTERVAL, CLAUDE_DIR } from './core/env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

const app = new Hono()

app.use('/*', cors())

app.get('/api/health', (c) => c.json({ ok: true, timestamp: Date.now() }))

app.route('/api/work-items', workItemRoutes)
app.route('/api/agent-runs', agentRunRoutes)
app.route('/api/events', eventRoutes)
app.route('/api/enrich', enrichRoutes)

app.post('/api/scanner/trigger', (c) => {
  scan()
  return c.json({ ok: true, message: 'Scan triggered' })
})

app.get('/api/scanner/status', (c) => {
  return c.json({ ok: true, interval: SCAN_INTERVAL, claudeDir: CLAUDE_DIR })
})

if (existsSync(publicDir)) {
  app.use('/assets/*', serveStatic({ root: publicDir }))
  app.use('/favicon.ico', serveStatic({ root: publicDir }))
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api')) return c.notFound()
    const html = readFileSync(resolve(publicDir, 'index.html'), 'utf-8')
    return c.html(html)
  })
}

startScanner()

serve({ fetch: app.fetch, port: Number(PORT) }, (info) => {
  console.log(`Agent Ops Dashboard running on http://localhost:${info.port}`)
})

export default app
```

#### `frontend/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Ops Dashboard</title>
  <link rel="stylesheet" href="https://unpkg.com/primeicons/primeicons.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

#### `frontend/vite.config.js`
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3100',
    },
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
})
```

#### `frontend/src/main.js`
```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import router from './router/index.js'
import App from './App.vue'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: '.dark' }
  }
})
app.mount('#app')
```

#### `frontend/src/App.vue`
```vue
<template>
  <div class="min-h-screen bg-surface-ground">
    <header class="bg-surface-0 border-b border-surface-200 px-6 py-3 flex items-center justify-between">
      <router-link to="/" class="text-xl font-bold text-surface-900 no-underline">
        Agent Ops
      </router-link>
      <button
        class="px-3 py-1 bg-primary text-white rounded text-sm cursor-pointer border-none"
        @click="triggerScan"
      >
        <i class="pi pi-refresh mr-1"></i> Scan Now
      </button>
    </header>
    <main class="p-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useApi } from './composables/useApi.js'
const { post } = useApi()
function triggerScan() {
  post('/api/scanner/trigger')
}
</script>
```

#### `frontend/src/router/index.js`
```js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/MissionControl.vue') },
  { path: '/work-items/:id', component: () => import('../views/WorkItemDetail.vue') },
  { path: '/agent-runs/:id', component: () => import('../views/AgentRunDetail.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
```

#### `frontend/src/composables/useApi.js`
```js
import { ref } from 'vue'

export function useApi() {
  const loading = ref(false)
  const error = ref(null)

  async function get(url) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(url)
      return await res.json()
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function post(url, body) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      return await res.json()
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function patch(url, body) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return await res.json()
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  return { get, post, patch, loading, error }
}
```

#### `frontend/src/assets/main.css`
```css
@import 'primeicons/primeicons.css';

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-rogue { background: #fee2e2; color: #dc2626; }
.badge-running { background: #dbeafe; color: #2563eb; }
.badge-completed { background: #dcfce7; color: #16a34a; }
.badge-failed { background: #fef3c7; color: #d97706; }
.badge-todo { background: #f3f4f6; color: #6b7280; }
.badge-in_progress { background: #dbeafe; color: #2563eb; }
.badge-blocked { background: #fee2e2; color: #dc2626; }
.badge-done { background: #dcfce7; color: #16a34a; }
```

#### `frontend/src/components/AgentRunBadge.vue`
```vue
<template>
  <span :class="['badge', badgeClass]">
    <i :class="['pi', iconClass, 'mr-1']" style="font-size: 0.7rem"></i>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
  rogue: { type: Boolean, default: false },
})

const badgeClass = computed(() => props.rogue ? 'badge-rogue' : `badge-${props.status}`)
const iconClass = computed(() => {
  if (props.rogue) return 'pi-exclamation-triangle'
  switch (props.status) {
    case 'running': return 'pi-spin pi-spinner'
    case 'completed': return 'pi-check-circle'
    case 'failed': return 'pi-times-circle'
    default: return 'pi-circle'
  }
})
const label = computed(() => props.rogue ? 'Rogue' : props.status)
</script>
```

#### `frontend/src/components/EventTimeline.vue`
```vue
<template>
  <div class="space-y-3">
    <div v-for="event in events" :key="event.id" class="flex items-start gap-3 text-sm">
      <div class="flex-shrink-0 mt-1">
        <i :class="['pi', iconForType(event.type)]" :style="{ color: colorForType(event.type) }"></i>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-surface-800">{{ event.message }}</p>
        <p class="text-xs text-surface-400 mt-0.5">{{ formatTime(event.timestamp) }}</p>
      </div>
    </div>
    <p v-if="!events.length" class="text-sm text-surface-400">No events yet</p>
  </div>
</template>

<script setup>
defineProps({ events: { type: Array, required: true } })

function iconForType(type) {
  const map = { agent_start: 'pi-play', agent_stop: 'pi-stop', tool_use: 'pi-wrench', commit: 'pi-code', ci: 'pi-server', manual: 'pi-link' }
  return map[type] || 'pi-circle'
}
function colorForType(type) {
  const map = { agent_start: '#16a34a', agent_stop: '#6b7280', tool_use: '#2563eb', commit: '#7c3aed', ci: '#d97706', manual: '#0891b2' }
  return map[type] || '#9ca3af'
}
function formatTime(ts) { return new Date(ts).toLocaleString() }
</script>
```

#### `frontend/src/components/KanbanBoard.vue`
```vue
<template>
  <div class="grid grid-cols-4 gap-4">
    <div v-for="col in columns" :key="col.status" class="min-w-0">
      <h2 class="text-sm font-bold uppercase tracking-wide text-surface-500 mb-3 px-1">
        {{ col.label }}
        <span class="ml-1 text-xs font-normal">({{ col.items.length }})</span>
      </h2>
      <div class="space-y-0">
        <WorkItemCard v-for="item in col.items" :key="item.id" :item="item" />
        <p v-if="!col.items.length" class="text-xs text-surface-400 px-1">No items</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import WorkItemCard from './WorkItemCard.vue'

const props = defineProps({ items: { type: Array, required: true } })

const columns = computed(() => [
  { status: 'todo', label: 'Todo', items: props.items.filter(i => i.status === 'todo') },
  { status: 'in_progress', label: 'In Progress', items: props.items.filter(i => i.status === 'in_progress') },
  { status: 'blocked', label: 'Blocked', items: props.items.filter(i => i.status === 'blocked') },
  { status: 'done', label: 'Done', items: props.items.filter(i => i.status === 'done') },
])
</script>
```

#### `frontend/src/components/WorkItemCard.vue`
```vue
<template>
  <router-link :to="`/work-items/${item.id}`"
    class="block bg-surface-0 border border-surface-200 rounded-lg p-4 mb-3 no-underline text-surface-900 hover:border-primary transition-colors cursor-pointer">
    <div class="flex items-start justify-between mb-2">
      <h3 class="text-sm font-semibold leading-tight">{{ item.title }}</h3>
      <span v-if="item.externalId" class="text-xs text-surface-500 ml-2 whitespace-nowrap">{{ item.externalId }}</span>
    </div>
    <div class="flex flex-wrap gap-1 mb-2">
      <AgentRunBadge v-for="run in item.agentRuns" :key="run.id" :status="run.status" :rogue="!run.workItemId" />
    </div>
    <p v-if="item.latestEvent" class="text-xs text-surface-500 truncate">
      {{ item.latestEvent.message }}
      <span class="ml-1">{{ timeAgo(item.latestEvent.timestamp) }}</span>
    </p>
  </router-link>
</template>

<script setup>
import AgentRunBadge from './AgentRunBadge.vue'
defineProps({ item: { type: Object, required: true } })
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
</script>
```

#### `frontend/src/views/MissionControl.vue`
```vue
<template>
  <div>
    <div v-if="rogueRuns.length" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <h2 class="text-sm font-bold text-red-700 mb-2">
        <i class="pi pi-exclamation-triangle mr-1"></i> Rogue Agents ({{ rogueRuns.length }})
      </h2>
      <div class="flex flex-wrap gap-2">
        <router-link v-for="run in rogueRuns" :key="run.id" :to="`/agent-runs/${run.id}`"
          class="bg-white border border-red-200 rounded px-3 py-2 text-sm no-underline text-surface-900 hover:border-red-400">
          <AgentRunBadge :status="run.status" :rogue="true" />
          <span class="ml-2 text-xs text-surface-500">{{ run.projectPath }}</span>
        </router-link>
      </div>
    </div>
    <KanbanBoard :items="workItems" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import KanbanBoard from '../components/KanbanBoard.vue'
import AgentRunBadge from '../components/AgentRunBadge.vue'

const { get } = useApi()
const workItems = ref([])
const rogueRuns = ref([])
let pollInterval

async function refresh() {
  const items = await get('/api/work-items')
  if (items) workItems.value = items
  const runs = await get('/api/agent-runs?rogue=true')
  if (runs) rogueRuns.value = runs.filter(r => r.status === 'running')
}

onMounted(() => { refresh(); pollInterval = setInterval(refresh, 15000) })
onUnmounted(() => clearInterval(pollInterval))
</script>
```

#### `frontend/src/views/WorkItemDetail.vue`
```vue
<template>
  <div v-if="item">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-surface-400 hover:text-surface-600"><i class="pi pi-arrow-left"></i></router-link>
      <h1 class="text-xl font-bold">{{ item.title }}</h1>
      <span :class="['badge', `badge-${item.status}`]">{{ item.status }}</span>
      <span v-if="item.externalId" class="text-sm text-surface-500">{{ item.externalId }}</span>
    </div>
    <div class="grid grid-cols-3 gap-6">
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-surface-500 mb-3">Agent Runs</h2>
        <div v-for="run in item.agentRuns" :key="run.id" class="bg-surface-0 border border-surface-200 rounded-lg p-3 mb-2">
          <div class="flex items-center gap-2 mb-1">
            <AgentRunBadge :status="run.status" />
            <router-link :to="`/agent-runs/${run.id}`" class="text-xs text-primary no-underline">details</router-link>
          </div>
          <p class="text-xs text-surface-500 truncate">{{ run.projectPath }}</p>
        </div>
        <p v-if="!item.agentRuns?.length" class="text-sm text-surface-400">No agent runs</p>
      </div>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-surface-500 mb-3">Timeline</h2>
        <EventTimeline :events="item.events || []" />
      </div>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-surface-500 mb-3">Details</h2>
        <div class="bg-surface-0 border border-surface-200 rounded-lg p-3 text-sm">
          <div class="mb-2"><span class="text-surface-500">Source:</span><span class="ml-2">{{ item.source }}</span></div>
          <div class="mb-2"><span class="text-surface-500">Created:</span><span class="ml-2">{{ new Date(item.createdAt).toLocaleString() }}</span></div>
          <div><span class="text-surface-500">Updated:</span><span class="ml-2">{{ new Date(item.updatedAt).toLocaleString() }}</span></div>
        </div>
        <div class="mt-4">
          <h3 class="text-xs font-bold uppercase text-surface-500 mb-2">Change Status</h3>
          <div class="flex flex-wrap gap-1">
            <button v-for="s in ['todo', 'in_progress', 'blocked', 'done']" :key="s"
              :class="['px-2 py-1 text-xs rounded border cursor-pointer', item.status === s ? 'bg-primary text-white border-primary' : 'bg-surface-0 border-surface-200 text-surface-600']"
              @click="updateStatus(s)">{{ s.replace('_', ' ') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-surface-400">Loading...</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import EventTimeline from '../components/EventTimeline.vue'
import AgentRunBadge from '../components/AgentRunBadge.vue'

const route = useRoute()
const { get, patch } = useApi()
const item = ref(null)

async function load() { item.value = await get(`/api/work-items/${route.params.id}`) }
async function updateStatus(status) { await patch(`/api/work-items/${route.params.id}`, { status }); await load() }
onMounted(load)
</script>
```

#### `frontend/src/views/AgentRunDetail.vue`
```vue
<template>
  <div v-if="run">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-surface-400 hover:text-surface-600"><i class="pi pi-arrow-left"></i></router-link>
      <h1 class="text-xl font-bold">Agent Run</h1>
      <AgentRunBadge :status="run.status" :rogue="!run.workItemId" />
    </div>
    <div class="grid grid-cols-2 gap-6">
      <div class="bg-surface-0 border border-surface-200 rounded-lg p-4">
        <h2 class="text-sm font-bold uppercase tracking-wide text-surface-500 mb-3">Session Info</h2>
        <div class="space-y-2 text-sm">
          <div><span class="text-surface-500">Session ID:</span><span class="ml-2 font-mono text-xs">{{ run.sessionId }}</span></div>
          <div><span class="text-surface-500">Project:</span><span class="ml-2">{{ run.projectPath }}</span></div>
          <div><span class="text-surface-500">Status:</span><span class="ml-2">{{ run.status }}</span></div>
          <div v-if="run.lastOutput"><span class="text-surface-500">Last Output:</span>
            <p class="mt-1 bg-surface-50 p-2 rounded text-xs font-mono whitespace-pre-wrap">{{ run.lastOutput }}</p>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-surface-200">
          <h3 class="text-xs font-bold uppercase text-surface-500 mb-2">{{ run.workItemId ? 'Linked Work Item' : 'Link to Work Item' }}</h3>
          <div v-if="run.workItemId">
            <router-link :to="`/work-items/${run.workItemId}`" class="text-primary text-sm no-underline">View Work Item</router-link>
          </div>
          <div v-else>
            <select class="w-full border border-surface-200 rounded px-2 py-1 text-sm" @change="linkToWorkItem($event.target.value)">
              <option value="">Select work item...</option>
              <option v-for="wi in workItems" :key="wi.id" :value="wi.id">{{ wi.title }} {{ wi.externalId ? `(${wi.externalId})` : '' }}</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-surface-500 mb-3">Events</h2>
        <EventTimeline :events="runEvents" />
      </div>
    </div>
  </div>
  <div v-else class="text-surface-400">Loading...</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import AgentRunBadge from '../components/AgentRunBadge.vue'
import EventTimeline from '../components/EventTimeline.vue'

const route = useRoute()
const { get, patch } = useApi()
const run = ref(null)
const runEvents = ref([])
const workItems = ref([])

async function load() {
  run.value = await get(`/api/agent-runs/${route.params.id}`)
  runEvents.value = await get(`/api/agent-runs/${route.params.id}/events`) || []
  if (!run.value?.workItemId) workItems.value = await get('/api/work-items') || []
}
async function linkToWorkItem(workItemId) {
  if (!workItemId) return
  await patch(`/api/agent-runs/${route.params.id}`, { workItemId })
  await load()
}
onMounted(load)
</script>
```

#### `Dockerfile`
```dockerfile
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/ ./backend/
COPY --from=frontend-build /app/backend/public ./backend/public
RUN mkdir -p data

ENV PORT=3100
ENV CLAUDE_DIR=/root/.claude
EXPOSE 3100
CMD ["node", "backend/src/index.js"]
```

#### `docker-compose.yml`
```yaml
services:
  app:
    build: .
    ports:
      - "3100:3100"
    volumes:
      - ./data:/app/data
      - ~/.claude:/root/.claude:ro
    environment:
      - PORT=3100
      - CLAUDE_DIR=/root/.claude
```

### 4. Generate and Run Migrations

```bash
cd backend
npx drizzle-kit generate
node src/core/migrate.js
cd ..
```

### 5. Run

```bash
npm run dev:backend   # http://localhost:3100
npm run dev:frontend  # http://localhost:5173
```

Open http://localhost:5173 to see the dashboard. The scanner will automatically discover Claude Code sessions from `~/.claude/projects/`.

### 6. Commit

```bash
git add -A && git commit -m "feat: agent ops dashboard MVP"
```
