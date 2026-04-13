<template>
  <div class="space-y-1">
    <div
      v-for="(event, idx) in events"
      :key="event.id"
      class="flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors"
      style="border-left: 2px solid transparent;"
      :style="{ borderLeftColor: colorForType(event.type), animationDelay: `${idx * 30}ms` }"
      @mouseenter="$el => $el.target?.closest?.('.flex')?.style && Object.assign($el.target.closest('.flex').style, { background: 'var(--bg-elevated)' })"
    >
      <div class="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
        :style="{ background: bgForType(event.type) }">
        <i :class="['pi', iconForType(event.type)]"
          :style="{ color: colorForType(event.type), fontSize: '0.6rem' }"></i>
      </div>
      <div class="min-w-0 flex-1">
        <p style="font-family: var(--font-display); font-size: 0.8rem; color: var(--text-primary); line-height: 1.4;">
          {{ event.message }}
        </p>
        <p class="ops-timestamp mt-0.5">{{ formatTime(event.timestamp) }}</p>
      </div>
    </div>
    <div v-if="!events.length" class="flex items-center justify-center py-8 rounded-lg" style="border: 1px dashed var(--border-subtle);">
      <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;">
        No events recorded
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({ events: { type: Array, required: true } })

function iconForType(type) {
  const map = {
    agent_start: 'pi-play',
    agent_stop: 'pi-stop',
    tool_use: 'pi-wrench',
    commit: 'pi-code',
    ci: 'pi-server',
    manual: 'pi-link',
  }
  return map[type] || 'pi-circle'
}

function colorForType(type) {
  const map = {
    agent_start: 'var(--accent-green)',
    agent_stop: 'var(--text-muted)',
    tool_use: 'var(--accent-cyan)',
    commit: 'var(--accent-purple)',
    ci: 'var(--accent-amber)',
    manual: 'var(--accent-cyan)',
  }
  return map[type] || 'var(--text-muted)'
}

function bgForType(type) {
  const map = {
    agent_start: 'var(--accent-green-dim)',
    agent_stop: 'rgba(100,116,139,0.1)',
    tool_use: 'var(--accent-cyan-dim)',
    commit: 'var(--accent-purple-dim)',
    ci: 'var(--accent-amber-dim)',
    manual: 'var(--accent-cyan-dim)',
  }
  return map[type] || 'rgba(100,116,139,0.1)'
}

function formatTime(ts) {
  const d = new Date(ts)
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = d.toLocaleDateString('sv-SE')
  return `${date}  ${time}`
}
</script>
