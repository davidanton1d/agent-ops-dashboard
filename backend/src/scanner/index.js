// backend/src/scanner/index.js
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { db } from '../core/db.js'
import { agentRuns, events, workItems } from '../../database/schema/index.js'
import { eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { CLAUDE_DIR, SCAN_INTERVAL } from '../core/env.js'
import { extractTicketId, extractToolUses } from './patterns.js'

const IDLE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes of no file changes = completed
const BATCH_SIZE = 10

// Track file state: line count and byte size
const fileCursors = new Map()
// Track actual file mtime per session for accurate staleness detection
const fileLastModified = new Map()

let scanning = false

export function startScanner() {
  console.log(`Scanner started — interval ${SCAN_INTERVAL}ms, watching ${CLAUDE_DIR}/projects/`)
  setTimeout(() => scan(), 500)
  return setInterval(scan, SCAN_INTERVAL)
}

export async function scan() {
  if (scanning) return
  scanning = true

  const projectsDir = join(CLAUDE_DIR, 'projects')
  let projectDirs
  try { projectDirs = readdirSync(projectsDir) } catch { scanning = false; return }

  const now = Date.now()

  // Collect all JSONL files
  const files = []
  for (const projectSlug of projectDirs) {
    const projectPath = join(projectsDir, projectSlug)
    try {
      const stat = statSync(projectPath)
      if (!stat.isDirectory()) continue
      const entries = readdirSync(projectPath)
      for (const file of entries.filter(f => f.endsWith('.jsonl'))) {
        files.push({
          sessionId: file.replace('.jsonl', ''),
          filePath: join(projectPath, file),
          projectSlug,
        })
      }
    } catch { continue }
  }

  // Process in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    for (const { sessionId, filePath, projectSlug } of batch) {
      try {
        processSession(sessionId, filePath, projectSlug, now)
      } catch (err) {
        console.error(`Scanner error for ${sessionId}:`, err.message)
      }
    }
    if (i + BATCH_SIZE < files.length) {
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  markStaleSessionsCompleted(now)
  scanning = false
}

function processSession(sessionId, filePath, projectSlug, now) {
  const existing = db.select().from(agentRuns)
    .where(eq(agentRuns.sessionId, sessionId)).limit(1).get()

  const cursorKey = `${projectSlug}/${sessionId}`
  const lineCursor = fileCursors.get(cursorKey) || 0

  const stat = statSync(filePath)
  const fileMtime = stat.mtimeMs

  // Always track file mtime for staleness detection
  fileLastModified.set(sessionId, fileMtime)

  // If file is recently modified and session was completed, re-activate it
  if (existing && existing.status === 'completed' && (now - fileMtime) < IDLE_THRESHOLD_MS) {
    db.update(agentRuns).set({ status: 'running', updatedAt: now })
      .where(eq(agentRuns.id, existing.id)).run()
    db.insert(events).values({
      id: ulid(), workItemId: existing.workItemId, agentRunId: existing.id,
      type: 'agent_start', message: 'Agent session resumed (file activity detected)',
      metadata: null, timestamp: now,
    }).run()
  }

  // Skip if file hasn't grown
  if (existing && stat.size === (fileCursors.get(cursorKey + ':size') || 0)) return

  const content = readFileSync(filePath, 'utf-8')
  const allLines = content.split('\n').filter(Boolean)

  if (lineCursor >= allLines.length && existing) return

  const newLines = allLines.slice(lineCursor)
  fileCursors.set(cursorKey, allLines.length)
  fileCursors.set(cursorKey + ':size', stat.size)

  let cwd = null
  let ticketId = null
  const isNewSession = !existing

  for (const line of newLines) {
    let parsed
    try { parsed = JSON.parse(line) } catch { continue }

    if (!cwd && parsed.cwd) cwd = parsed.cwd

    if (parsed.type === 'user' && parsed.message?.content) {
      const text = typeof parsed.message.content === 'string' ? parsed.message.content : ''
      if (!ticketId) ticketId = extractTicketId(text)
    }
  }

  if (isNewSession) {
    // Determine initial status based on file recency
    const isActive = (now - fileMtime) < IDLE_THRESHOLD_MS
    const agentRun = {
      id: ulid(), workItemId: null, sessionId,
      projectPath: cwd || '/' + projectSlug.replace(/-/g, '/'),
      status: isActive ? 'running' : 'completed',
      lastOutput: null, createdAt: now, updatedAt: now,
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
    const lastMtime = fileLastModified.get(run.sessionId)
    // Use actual file mtime, not updatedAt
    const lastActivity = lastMtime || run.updatedAt
    if (now - lastActivity > IDLE_THRESHOLD_MS) {
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
