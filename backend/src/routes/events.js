import { Hono } from 'hono'
import { db } from '../core/db.js'
import { events } from '../../database/schema/index.js'
import { ulid } from 'ulid'

const app = new Hono()

// Create event (used by hooks or manual)
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
