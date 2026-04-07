import { Hono } from 'hono'

const app = new Hono()

// Freshservice enrichment stub
app.get('/freshservice/:incId', async (c) => {
  const { incId } = c.req.param()
  return c.json({
    incId,
    enriched: false,
    message: `Freshservice enrichment for INC-${incId} not yet connected. Will use Freshservice MCP.`,
  })
})

// Azure DevOps enrichment stub
app.get('/devops/:identifier', async (c) => {
  const { identifier } = c.req.param()
  return c.json({
    identifier,
    enriched: false,
    message: `Azure DevOps enrichment for ${identifier} not yet connected. Will use Azure DevOps MCP.`,
  })
})

export default app
