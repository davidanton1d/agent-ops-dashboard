import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { PORT } from './core/env.js'

const app = new Hono()

app.use('/*', cors())

app.get('/api/health', (c) => c.json({ ok: true, timestamp: Date.now() }))

serve({ fetch: app.fetch, port: Number(PORT) }, (info) => {
  console.log(`Agent Ops Dashboard running on http://localhost:${info.port}`)
})

export default app
