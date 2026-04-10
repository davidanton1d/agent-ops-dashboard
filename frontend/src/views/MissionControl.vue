<template>
  <div>
    <!-- Rogue agents section -->
    <div v-if="rogueRuns.length" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <h2 class="text-sm font-bold text-red-700 mb-2">
        <i class="pi pi-exclamation-triangle mr-1"></i>
        Rogue Agents ({{ rogueRuns.length }})
      </h2>
      <div class="flex flex-wrap gap-2">
        <router-link
          v-for="run in rogueRuns"
          :key="run.id"
          :to="`/agent-runs/${run.id}`"
          class="bg-white border border-red-200 rounded px-3 py-2 text-sm no-underline text-gray-900 hover:border-red-400"
        >
          <AgentRunBadge :status="run.status" :rogue="true" />
          <span class="ml-2 text-xs text-gray-500">{{ run.projectPath }}</span>
        </router-link>
      </div>
    </div>

    <!-- Kanban board -->
    <KanbanBoard :items="workItems" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import KanbanBoard from '../components/KanbanBoard.vue'
import AgentRunBadge from '../components/AgentRunBadge.vue'

const { get } = useApi()
const workItems = ref([])
const rogueRuns = ref([])
let pollInterval

async function refresh() {
  const items = await get('/api/work-items')
  if (items) workItems.value = items

  const runs = await get('/api/agent-runs?rogue=true')
  if (runs) rogueRuns.value = runs.filter(r => r.status === 'running')
}

onMounted(() => {
  refresh()
  pollInterval = setInterval(refresh, 15000)
})

onUnmounted(() => {
  clearInterval(pollInterval)
})
</script>
