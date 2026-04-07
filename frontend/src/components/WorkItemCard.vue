<template>
  <router-link
    :to="`/work-items/${item.id}`"
    class="block bg-surface-0 border border-surface-200 rounded-lg p-4 mb-3 no-underline text-surface-900 hover:border-primary transition-colors cursor-pointer"
  >
    <div class="flex items-start justify-between mb-2">
      <h3 class="text-sm font-semibold leading-tight">{{ item.title }}</h3>
      <span v-if="item.externalId" class="text-xs text-surface-500 ml-2 whitespace-nowrap">
        {{ item.externalId }}
      </span>
    </div>

    <div class="flex flex-wrap gap-1 mb-2">
      <AgentRunBadge
        v-for="run in item.agentRuns"
        :key="run.id"
        :status="run.status"
        :rogue="!run.workItemId"
      />
    </div>

    <p v-if="item.latestEvent" class="text-xs text-surface-500 truncate">
      {{ item.latestEvent.message }}
      <span class="ml-1">{{ timeAgo(item.latestEvent.timestamp) }}</span>
    </p>
  </router-link>
</template>

<script setup>
import AgentRunBadge from './AgentRunBadge.vue'

defineProps({
  item: { type: Object, required: true },
})

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>
