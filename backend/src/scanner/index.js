// backend/src/scanner/index.js
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { db } from '../core/db.js'
import { agentRuns, events, workItems } from '../../database/schema/index.js'
import { eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { CLAUDE_DIR, SCAN_INTERVAL } from '../core/env.js'
import { extractTicketId, extractToolUses } from './patterns.js'

const IDLE_THRESHOLD_MS = 2 * 60 * 1000

// Track last-known line counts to only process new lines
const fileCursors = new Map()

export function startScanner() {
  console.log(`Scanner started — interval ${SCAN_INTERVAL}ms, watching ${CLAUDE_DIR}/projects/`)
  scan()
  return setInterval(scan, SCAN_INTERVAL)
}

export function scan() {
  const projectsDir = join(CLAUDE_DIR, 'projects')
  let projectDirs
  try {
    projectDirs = readdirSync(projectsDir)
  } catch {
    return
  }

  const now = Date.now()

  for (const projectSlug of projectDirs) {
    const projectPath = join(projectsDir, projectSlug)
    let entries
    try {
      const stat = statSync(projectPath)
      if (!stat.isDirectory()) continue
      entries = readdirSync(projectPath)
    } catch {
      continue
    }

    const jsonlFiles = entries.filter(f => f.endsWith('.jsonl'))

    for (const file of jsonlFiles) {
      const sessionId = file.replace('.jsonl', '')
      const filePath = join(projectPath, file)

      try {
        processSession(sessionId, filePath, projectSlug, now)
      } catch (err) {
        console.error(`Scanner error for ${sessionId}:`, err.message)
      }
    }
  }

  markStaleSessionsCompleted(now)
}

function processSession(sessionId, filePath, projectSlug, now) {
  const stat = statSync(filePath)
  const fileSize = stat.size

  const existing = db.select().from(agentRuns)
    .where(eq(agentRuns.sessionId, sessionId))
    .limit(1)
    .get()

  const cursorKey = `${projectSlug}/${sessionId}`
  const lineCursor = fileCursors.get(cursorKey) || 0

  // Read file and split into lines
  const content = readFileSync(filePath, 'utf-8')
  const allLines = content.split('\n').filter(Boolean)

  // Nothing new to process
  if (lineCursor >= allLines.length && existing) {
    return
  }

  const newLines = allLines.slice(lineCursor)
  fileCursors.set(cursorKey, allLines.length)

  let cwd = null
  let ticketId = null
  const toolUseNames = []

  for (const line of newLines) {
    let parsed
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }

    if (!cwd && parsed.cwd) {
      cwd = parsed.cwd
    }

    if (parsed.type === 'user' && parsed.message?.content) {
      const text = typeof parsed.message.content === 'string'
        ? parsed.message.content
        : ''
      if (!ticketId) {
        ticketId = extractTicketId(text)
      }
    }

    if (parsed.type === 'assistant' && parsed.message?.content) {
      const tools = extractToolUses(parsed.message.content)
      toolUseNames.push(...tools)
    }
  }

  if (!existing) {
    const agentRun = {
      id: ulid(),
      workItemId: null,
      sessionId,
      projectPath: cwd || '/' + projectSlug.replace(/-/g, '/'),
      status: 'running',
      lastOutput: null,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(agentRuns).values(agentRun).run()

    db.insert(events).values({
      id: ulid(),
      workItemId: null,
      agentRunId: agentRun.id,
      type: 'agent_start',
      message: `Agent session started in ${agentRun.projectPath}`,
      metadata: JSON.stringify({ sessionId, projectSlug }),
      timestamp: now,
    }).run()

    if (ticketId) {
      linkToTicket(agentRun.id, ticketId, now)
    }
  } else {
    db.update(agentRuns)
      .set({ updatedAt: now, projectPath: cwd || existing.projectPath })
      .where(eq(agentRuns.id, existing.id))
      .run()

    if (ticketId && !existing.workItemId) {
      linkToTicket(existing.id, ticketId, now)
    }

    for (const toolName of toolUseNames) {
      db.insert(events).values({
        id: ulid(),
        workItemId: existing.workItemId,
        agentRunId: existing.id,
        type: 'tool_use',
        message: `Used tool: ${toolName}`,
        metadata: JSON.stringify({ tool: toolName }),
        timestamp: now,
      }).run()
    }
  }
}

function linkToTicket(agentRunId, ticketId, now) {
  const externalId = `INC-${ticketId}`

  let workItem = db.select().from(workItems)
    .where(eq(workItems.externalId, externalId))
    .limit(1)
    .get()

  if (!workItem) {
    workItem = {
      id: ulid(),
      title: `Freshservice ${externalId}`,
      source: 'auto',
      externalId,
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    }
    db.insert(workItems).values(workItem).run()
  }

  db.update(agentRuns)
    .set({ workItemId: workItem.id, updatedAt: now })
    .where(eq(agentRuns.id, agentRunId))
    .run()

  db.insert(events).values({
    id: ulid(),
    workItemId: workItem.id,
    agentRunId,
    type: 'manual',
    message: `Auto-linked to ${externalId}`,
    metadata: JSON.stringify({ ticketId, externalId }),
    timestamp: now,
  }).run()
}

function markStaleSessionsCompleted(now) {
  const running = db.select().from(agentRuns)
    .where(eq(agentRuns.status, 'running'))
    .all()

  for (const run of running) {
    if (now - run.updatedAt > IDLE_THRESHOLD_MS) {
      db.update(agentRuns)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(agentRuns.id, run.id))
        .run()

      db.insert(events).values({
        id: ulid(),
        workItemId: run.workItemId,
        agentRunId: run.id,
        type: 'agent_stop',
        message: 'Agent session completed (idle timeout)',
        metadata: null,
        timestamp: now,
      }).run()
    }
  }
}
