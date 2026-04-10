<template>
  <div v-if="item">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600">
        <i class="pi pi-arrow-left"></i>
      </router-link>
      <h1 class="text-xl font-bold">{{ item.title }}</h1>
      <span :class="['badge', `badge-${item.status}`]">{{ item.status }}</span>
      <span v-if="item.externalId" class="text-sm text-gray-500">{{ item.externalId }}</span>
    </div>

    <!-- Three-column layout -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Left: Agent Runs -->
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Agent Runs</h2>
        <div v-for="run in item.agentRuns" :key="run.id" class="bg-white border border-gray-200 rounded-lg p-3 mb-2">
          <div class="flex items-center gap-2 mb-1">
            <AgentRunBadge :status="run.status" />
            <router-link :to="`/agent-runs/${run.id}`" class="text-xs text-blue-600 no-underline">
              details
            </router-link>
          </div>
          <p class="text-xs text-gray-500 truncate">{{ run.projectPath }}</p>
          <p v-if="run.lastOutput" class="text-xs text-gray-600 mt-1 truncate">{{ run.lastOutput }}</p>
        </div>
        <p v-if="!item.agentRuns?.length" class="text-sm text-gray-400">No agent runs</p>
      </div>

      <!-- Center: Timeline -->
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Timeline</h2>
        <EventTimeline :events="item.events || []" />
      </div>

      <!-- Right: Details -->
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Details</h2>
        <div class="bg-white border border-gray-200 rounded-lg p-3 text-sm">
          <div class="mb-2">
            <span class="text-gray-500">Source:</span>
            <span class="ml-2">{{ item.source }}</span>
          </div>
          <div class="mb-2">
            <span class="text-gray-500">Created:</span>
            <span class="ml-2">{{ formatTime(item.createdAt) }}</span>
          </div>
          <div>
            <span class="text-gray-500">Updated:</span>
            <span class="ml-2">{{ formatTime(item.updatedAt) }}</span>
          </div>
        </div>

        <!-- Status changer -->
        <div class="mt-4">
          <h3 class="text-xs font-bold uppercase text-gray-500 mb-2">Change Status</h3>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="s in ['todo', 'in_progress', 'blocked', 'done']"
              :key="s"
              :class="['px-2 py-1 text-xs rounded border cursor-pointer', item.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600']"
              @click="updateStatus(s)"
            >
              {{ s.replace('_', ' ') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-gray-400">Loading...</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import EventTimeline from '../components/EventTimeline.vue'
import AgentRunBadge from '../components/AgentRunBadge.vue'

const route = useRoute()
const { get, patch } = useApi()
const item = ref(null)

async function load() {
  item.value = await get(`/api/work-items/${route.params.id}`)
}

async function updateStatus(status) {
  await patch(`/api/work-items/${route.params.id}`, { status })
  await load()
}

function formatTime(ts) {
  return new Date(ts).toLocaleString()
}

onMounted(load)
</script>
