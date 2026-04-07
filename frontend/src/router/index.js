import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/MissionControl.vue') },
  { path: '/work-items/:id', component: () => import('../views/WorkItemDetail.vue') },
  { path: '/agent-runs/:id', component: () => import('../views/AgentRunDetail.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
