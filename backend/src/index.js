import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { PORT } from './core/env.js'
import workItemRoutes from './routes/work-items.js'
import { startScanner, scan } from './scanner/index.js'
import { SCAN_INTERVAL, CLAUDE_DIR } from './core/env.js'

const app = new Hono()

app.use('/*', cors())

app.get('/api/health', (c) => c.json({ ok: true, timestamp: Date.now() }))

app.route('/api/work-items', workItemRoutes)

// Scanner control routes
app.post('/api/scanner/trigger', (c) => {
  scan()
  return c.json({ ok: true, message: 'Scan triggered' })
})

app.get('/api/scanner/status', (c) => {
  return c.json({ ok: true, interval: SCAN_INTERVAL, claudeDir: CLAUDE_DIR })
})

// Start scanner after routes are defined
startScanner()

serve({ fetch: app.fetch, port: Number(PORT) }, (info) => {
  console.log(`Agent Ops Dashboard running on http://localhost:${info.port}`)
})

export default app
