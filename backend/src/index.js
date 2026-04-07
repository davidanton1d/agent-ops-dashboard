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

// Scanner control routes
app.post('/api/scanner/trigger', (c) => {
  scan()
  return c.json({ ok: true, message: 'Scan triggered' })
})

app.get('/api/scanner/status', (c) => {
  return c.json({ ok: true, interval: SCAN_INTERVAL, claudeDir: CLAUDE_DIR })
})

// Serve static frontend in production
if (existsSync(publicDir)) {
  app.use('/*', serveStatic({ root: './public' }))

  // SPA fallback
  app.get('*', (c) => {
    const html = readFileSync(resolve(publicDir, 'index.html'), 'utf-8')
    return c.html(html)
  })
}

// Start scanner after routes are defined
startScanner()

serve({ fetch: app.fetch, port: Number(PORT) }, (info) => {
  console.log(`Agent Ops Dashboard running on http://localhost:${info.port}`)
})

export default app
