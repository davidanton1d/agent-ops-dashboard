<template>
  <div>
    <!-- Stats bar -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div v-for="stat in stats" :key="stat.label" class="ops-panel px-4 py-3">
        <div class="flex items-center justify-between">
          <div>
            <div style="font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">
              {{ stat.label }}
            </div>
            <div class="mt-1" style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">
              {{ stat.value }}
            </div>
          </div>
          <div class="w-9 h-9 rounded-lg flex items-center justify-center" :style="{ background: stat.bg }">
            <i :class="['pi', stat.icon]" :style="{ color: stat.color, fontSize: '0.9rem' }"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Rogue agents alert -->
    <div v-if="rogueRuns.length" class="ops-panel mb-6 overflow-hidden"
      style="border-color: rgba(248, 113, 113, 0.3);">
      <div class="px-4 py-2.5 flex items-center gap-3"
        style="background: linear-gradient(90deg, rgba(248,113,113,0.08), transparent);">
        <span class="status-dot rogue"></span>
        <span style="font-family: var(--font-mono); font-size: 0.65rem; font-weight: 600; color: var(--accent-red); text-transform: uppercase; letter-spacing: 0.08em;">
          {{ rogueRuns.length }} Rogue Agent{{ rogueRuns.length > 1 ? 's' : '' }} Detected
        </span>
      </div>
      <div class="px-4 py-3 flex flex-wrap gap-2">
        <router-link
          v-for="run in rogueRuns"
          :key="run.id"
          :to="`/agent-runs/${run.id}`"
          class="ops-card flex items-center gap-3 no-underline !py-2.5 !px-3"
          style="border-color: rgba(248, 113, 113, 0.15);"
        >
          <AgentRunBadge :status="run.status" :rogue="true" />
          <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);">
            {{ shortenPath(run.projectPath) }}
          </span>
        </router-link>
      </div>
    </div>

    <!-- Kanban board -->
    <KanbanBoard :items="workItems" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import KanbanBoard from '../components/KanbanBoard.vue'
import AgentRunBadge from '../components/AgentRunBadge.vue'

const { get } = useApi()
const workItems = ref([])
const rogueRuns = ref([])
const allRuns = ref([])
let pollInterval

const stats = computed(() => [
  {
    label: 'Work Items',
    value: workItems.value.length,
    icon: 'pi-th-large',
    color: 'var(--accent-cyan)',
    bg: 'var(--accent-cyan-dim)',
  },
  {
    label: 'Active Agents',
    value: allRuns.value.filter(r => r.status === 'running').length,
    icon: 'pi-bolt',
    color: 'var(--accent-green)',
    bg: 'var(--accent-green-dim)',
  },
  {
    label: 'Rogue',
    value: rogueRuns.value.length,
    icon: 'pi-exclamation-triangle',
    color: 'var(--accent-red)',
    bg: 'var(--accent-red-dim)',
  },
  {
    label: 'Completed',
    value: allRuns.value.filter(r => r.status === 'completed').length,
    icon: 'pi-check-circle',
    color: 'var(--accent-green)',
    bg: 'var(--accent-green-dim)',
  },
])

function shortenPath(path) {
  if (!path) return 'unknown'
  const parts = path.split('/')
  return parts.slice(-2).join('/')
}

async function refresh() {
  const items = await get('/api/work-items')
  if (items) workItems.value = items

  const runs = await get('/api/agent-runs')
  if (runs) {
    allRuns.value = runs
    rogueRuns.value = runs.filter(r => r.workItemId === null && r.status === 'running')
  }
}

onMounted(() => {
  refresh()
  pollInterval = setInterval(refresh, 15000)
})

onUnmounted(() => {
  clearInterval(pollInterval)
})
</script>
