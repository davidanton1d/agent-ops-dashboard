<template>
  <div class="space-y-3">
    <div
      v-for="event in events"
      :key="event.id"
      class="flex items-start gap-3 text-sm"
    >
      <div class="flex-shrink-0 mt-1">
        <i :class="['pi', iconForType(event.type)]" :style="{ color: colorForType(event.type) }"></i>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-gray-800">{{ event.message }}</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ formatTime(event.timestamp) }}</p>
      </div>
    </div>
    <p v-if="!events.length" class="text-sm text-gray-400">No events yet</p>
  </div>
</template>

<script setup>
defineProps({
  events: { type: Array, required: true },
})

function iconForType(type) {
  switch (type) {
    case 'agent_start': return 'pi-play'
    case 'agent_stop': return 'pi-stop'
    case 'tool_use': return 'pi-wrench'
    case 'commit': return 'pi-code'
    case 'ci': return 'pi-server'
    case 'manual': return 'pi-link'
    default: return 'pi-circle'
  }
}

function colorForType(type) {
  switch (type) {
    case 'agent_start': return '#16a34a'
    case 'agent_stop': return '#6b7280'
    case 'tool_use': return '#2563eb'
    case 'commit': return '#7c3aed'
    case 'ci': return '#d97706'
    case 'manual': return '#0891b2'
    default: return '#9ca3af'
  }
}

function formatTime(ts) {
  return new Date(ts).toLocaleString()
}
</script>
