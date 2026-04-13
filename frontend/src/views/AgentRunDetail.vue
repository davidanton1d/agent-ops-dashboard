<template>
  <div v-if="run">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <router-link to="/" class="ops-btn !px-2.5 !py-1.5">
        <i class="pi pi-arrow-left" style="font-size: 0.7rem;"></i>
      </router-link>
      <div class="flex-1">
        <h1 style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">
          Agent Run
        </h1>
        <div class="flex items-center gap-3 mt-1">
          <AgentRunBadge :status="run.status" :rogue="!run.workItemId" />
          <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);">
            {{ run.sessionId }}
          </span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <!-- Left: Run info -->
      <div>
        <div class="ops-section-title">Session Info</div>
        <div class="ops-panel p-4 space-y-4">
          <div v-for="field in sessionFields" :key="field.label">
            <div style="font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 4px;">
              {{ field.label }}
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); word-break: break-all;">
              {{ field.value }}
            </div>
          </div>

          <div v-if="run.lastOutput">
            <div style="font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 4px;">
              Last Output
            </div>
            <pre class="p-3 rounded-lg overflow-x-auto" style="background: var(--bg-deep); font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-cyan); white-space: pre-wrap; border: 1px solid var(--border-subtle);">{{ run.lastOutput }}</pre>
          </div>
        </div>

        <!-- Link to work item -->
        <div class="mt-5">
          <div class="ops-section-title">{{ run.workItemId ? 'Linked Work Item' : 'Link to Work Item' }}</div>
          <div v-if="run.workItemId">
            <router-link :to="`/work-items/${run.workItemId}`" class="ops-btn inline-flex items-center gap-2">
              <i class="pi pi-external-link" style="font-size: 0.65rem;"></i>
              View Work Item
            </router-link>
          </div>
          <div v-else>
            <select
              class="w-full rounded-lg px-3 py-2 cursor-pointer"
              style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.75rem;"
              @change="linkToWorkItem($event.target.value)"
            >
              <option value="">Select work item...</option>
              <option v-for="wi in workItems" :key="wi.id" :value="wi.id" style="background: var(--bg-panel);">
                {{ wi.title }} {{ wi.externalId ? `(${wi.externalId})` : '' }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Right: Events -->
      <div>
        <div class="ops-section-title">Events</div>
        <EventTimeline :events="runEvents" />
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-64">
    <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;">
      Loading...
    </span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import AgentRunBadge from '../components/AgentRunBadge.vue'
import EventTimeline from '../components/EventTimeline.vue'

const route = useRoute()
const { get, patch } = useApi()
const run = ref(null)
const runEvents = ref([])
const workItems = ref([])

const sessionFields = computed(() => {
  if (!run.value) return []
  return [
    { label: 'Session ID', value: run.value.sessionId },
    { label: 'Project Path', value: run.value.projectPath },
    { label: 'Status', value: run.value.status },
  ]
})

async function load() {
  run.value = await get(`/api/agent-runs/${route.params.id}`)
  runEvents.value = await get(`/api/agent-runs/${route.params.id}/events`) || []
  if (!run.value?.workItemId) {
    workItems.value = await get('/api/work-items') || []
  }
}

async function linkToWorkItem(workItemId) {
  if (!workItemId) return
  await patch(`/api/agent-runs/${route.params.id}`, { workItemId })
  await load()
}

onMounted(load)
</script>
