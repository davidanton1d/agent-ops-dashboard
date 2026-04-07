import { Hono } from 'hono'
import { db } from '../core/db.js'
import { workItems, agentRuns, events } from '../../database/schema/index.js'
import { eq, desc } from 'drizzle-orm'
import { ulid } from 'ulid'

const app = new Hono()

// List all work items with latest event and agent run count
app.get('/', async (c) => {
  const items = await db.select().from(workItems).orderBy(desc(workItems.updatedAt))

  const result = await Promise.all(items.map(async (item) => {
    const runs = await db.select().from(agentRuns).where(eq(agentRuns.workItemId, item.id))
    const latestEvent = await db.select().from(events)
      .where(eq(events.workItemId, item.id))
      .orderBy(desc(events.timestamp))
      .limit(1)

    return {
      ...item,
      agentRuns: runs,
      latestEvent: latestEvent[0] || null,
    }
  }))

  return c.json(result)
})

// Get single work item with all events and agent runs
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

// Create work item
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

// Update work item
app.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  await db.update(workItems)
    .set({ ...body, updatedAt: Date.now() })
    .where(eq(workItems.id, id))
  const updated = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1)
  return c.json(updated[0])
})

// Get events for work item
app.get('/:id/events', async (c) => {
  const { id } = c.req.param()
  const itemEvents = await db.select().from(events)
    .where(eq(events.workItemId, id))
    .orderBy(desc(events.timestamp))
  return c.json(itemEvents)
})

export default app
