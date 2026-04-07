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
