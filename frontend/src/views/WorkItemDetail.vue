<template>
  <div v-if="item">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <router-link to="/" class="ops-btn !px-2.5 !py-1.5">
        <i class="pi pi-arrow-left" style="font-size: 0.7rem;"></i>
      </router-link>
      <div class="flex-1">
        <h1 style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">
          {{ item.title }}
        </h1>
        <div class="flex items-center gap-3 mt-1">
          <span :class="['badge', `badge-${item.status}`]">{{ item.status }}</span>
          <span v-if="item.externalId" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">
            {{ item.externalId }}
          </span>
        </div>
      </div>
    </div>

    <!-- Three-column layout -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Left: Agent Runs -->
      <div>
        <div class="ops-section-title">Agent Runs</div>
        <div class="space-y-2">
          <div v-for="run in item.agentRuns" :key="run.id" class="ops-card">
            <div class="flex items-center justify-between mb-2">
              <AgentRunBadge :status="run.status" />
              <router-link :to="`/agent-runs/${run.id}`" class="ops-link">
                details &rarr;
              </router-link>
            </div>
            <p style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);" class="truncate">
              {{ run.projectPath }}
            </p>
          </div>
        </div>
        <div v-if="!item.agentRuns?.length" class="flex items-center justify-center py-8 rounded-lg" style="border: 1px dashed var(--border-subtle);">
          <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">No runs</span>
        </div>
      </div>

      <!-- Center: Timeline -->
      <div>
        <div class="ops-section-title">Event Timeline</div>
        <EventTimeline :events="item.events || []" />
      </div>

      <!-- Right: Details + Actions -->
      <div>
        <div class="ops-section-title">Details</div>
        <div class="ops-panel p-4 space-y-3">
          <div v-for="field in detailFields" :key="field.label" class="flex items-center justify-between">
            <span style="font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted);">
              {{ field.label }}
            </span>
            <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-secondary);">
              {{ field.value }}
            </span>
          </div>
        </div>

        <!-- Status changer -->
        <div class="mt-5">
          <div class="ops-section-title">Change Status</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in ['todo', 'in_progress', 'blocked', 'done']"
              :key="s"
              :class="['ops-btn', item.status === s ? 'ops-btn-active' : '']"
              @click="updateStatus(s)"
            >
              {{ s.replace('_', ' ') }}
            </button>
          </div>
        </div>
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
import EventTimeline from '../components/EventTimeline.vue'
import AgentRunBadge from '../components/AgentRunBadge.vue'

const route = useRoute()
const { get, patch } = useApi()
const item = ref(null)

const detailFields = computed(() => {
  if (!item.value) return []
  return [
    { label: 'Source', value: item.value.source },
    { label: 'Created', value: new Date(item.value.createdAt).toLocaleString('sv-SE') },
    { label: 'Updated', value: new Date(item.value.updatedAt).toLocaleString('sv-SE') },
    { label: 'Agents', value: item.value.agentRuns?.length || 0 },
    { label: 'Events', value: item.value.events?.length || 0 },
  ]
})

async function load() {
  item.value = await get(`/api/work-items/${route.params.id}`)
}

async function updateStatus(status) {
  await patch(`/api/work-items/${route.params.id}`, { status })
  await load()
}

onMounted(load)
</script>
