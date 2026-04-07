export default {
  schema: './database/schema/index.js',
  out: './database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '../data/agent-ops.db',
  },
}
