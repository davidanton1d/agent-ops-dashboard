<template>
  <router-link
    :to="`/work-items/${item.id}`"
    class="ops-card block no-underline mb-3"
    :style="{ animationDelay: `${index * 50}ms` }"
  >
    <div class="flex items-start justify-between mb-3">
      <h3 class="text-sm font-semibold leading-tight" style="color: var(--text-primary); font-family: var(--font-display);">
        {{ item.title }}
      </h3>
      <span v-if="item.externalId"
        class="ml-2 whitespace-nowrap px-2 py-0.5 rounded"
        style="font-family: var(--font-mono); font-size: 0.6rem; font-weight: 500; background: var(--bg-elevated); color: var(--text-secondary); letter-spacing: 0.05em;">
        {{ item.externalId }}
      </span>
    </div>

    <div class="flex flex-wrap gap-1.5 mb-3">
      <AgentRunBadge
        v-for="run in item.agentRuns"
        :key="run.id"
        :status="run.status"
        :rogue="!run.workItemId"
      />
    </div>

    <p v-if="item.latestEvent" class="flex items-center gap-2 truncate" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);">
      <i class="pi pi-angle-right" style="font-size: 0.55rem; color: var(--accent-cyan); opacity: 0.6;"></i>
      <span class="truncate">{{ item.latestEvent.message }}</span>
      <span class="ml-auto whitespace-nowrap opacity-60">{{ timeAgo(item.latestEvent.timestamp) }}</span>
    </p>
  </router-link>
</template>

<script setup>
import AgentRunBadge from './AgentRunBadge.vue'

defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
</script>
