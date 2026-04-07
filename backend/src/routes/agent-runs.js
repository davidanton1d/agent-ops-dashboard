import { Hono } from 'hono'
import { db } from '../core/db.js'
import { agentRuns, events } from '../../database/schema/index.js'
import { eq, desc } from 'drizzle-orm'

const app = new Hono()

// List agent runs (filterable by status, rogue-only)
app.get('/', async (c) => {
  const { status, rogue } = c.req.query()
  const runs = await db.select().from(agentRuns).orderBy(desc(agentRuns.updatedAt))
  let result = runs

  if (status) {
    result = result.filter(r => r.status === status)
  }
  if (rogue === 'true') {
    result = result.filter(r => r.workItemId === null)
  }

  return c.json(result)
})

// Get single agent run
app.get('/:id', async (c) => {
  const { id } = c.req.param()
  const run = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1)
  if (!run[0]) return c.json({ error: 'Not found' }, 404)
  return c.json(run[0])
})

// Link agent run to work item
app.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  await db.update(agentRuns)
    .set({ workItemId: body.workItemId, updatedAt: Date.now() })
    .where(eq(agentRuns.id, id))
  const updated = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1)
  return c.json(updated[0])
})

// Get events for agent run
app.get('/:id/events', async (c) => {
  const { id } = c.req.param()
  const runEvents = await db.select().from(events)
    .where(eq(events.agentRunId, id))
    .orderBy(desc(events.timestamp))
  return c.json(runEvents)
})

export default app
