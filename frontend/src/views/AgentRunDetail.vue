<template>
  <div v-if="run">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600">
        <i class="pi pi-arrow-left"></i>
      </router-link>
      <h1 class="text-xl font-bold">Agent Run</h1>
      <AgentRunBadge :status="run.status" :rogue="!run.workItemId" />
    </div>

    <div class="grid grid-cols-2 gap-6">
      <!-- Left: Run info -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Session Info</h2>
        <div class="space-y-2 text-sm">
          <div>
            <span class="text-gray-500">Session ID:</span>
            <span class="ml-2 font-mono text-xs">{{ run.sessionId }}</span>
          </div>
          <div>
            <span class="text-gray-500">Project:</span>
            <span class="ml-2">{{ run.projectPath }}</span>
          </div>
          <div>
            <span class="text-gray-500">Status:</span>
            <span class="ml-2">{{ run.status }}</span>
          </div>
          <div v-if="run.lastOutput">
            <span class="text-gray-500">Last Output:</span>
            <p class="mt-1 bg-gray-50 p-2 rounded text-xs font-mono whitespace-pre-wrap">{{ run.lastOutput }}</p>
          </div>
        </div>

        <!-- Link to work item -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <h3 class="text-xs font-bold uppercase text-gray-500 mb-2">
            {{ run.workItemId ? 'Linked Work Item' : 'Link to Work Item' }}
          </h3>
          <div v-if="run.workItemId">
            <router-link :to="`/work-items/${run.workItemId}`" class="text-blue-600 text-sm no-underline">
              View Work Item
            </router-link>
          </div>
          <div v-else>
            <select
              class="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              @change="linkToWorkItem($event.target.value)"
            >
              <option value="">Select work item...</option>
              <option v-for="wi in workItems" :key="wi.id" :value="wi.id">
                {{ wi.title }} {{ wi.externalId ? `(${wi.externalId})` : '' }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Right: Events -->
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Events</h2>
        <EventTimeline :events="runEvents" />
      </div>
    </div>
  </div>
  <div v-else class="text-gray-400">Loading...</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import AgentRunBadge from '../components/AgentRunBadge.vue'
import EventTimeline from '../components/EventTimeline.vue'

const route = useRoute()
const { get, patch } = useApi()
const run = ref(null)
const runEvents = ref([])
const workItems = ref([])

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
