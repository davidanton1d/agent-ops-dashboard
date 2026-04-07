<template>
  <span :class="['badge', badgeClass]">
    <i :class="['pi', iconClass, 'mr-1']" style="font-size: 0.7rem"></i>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
  rogue: { type: Boolean, default: false },
})

const badgeClass = computed(() => props.rogue ? 'badge-rogue' : `badge-${props.status}`)

const iconClass = computed(() => {
  if (props.rogue) return 'pi-exclamation-triangle'
  switch (props.status) {
    case 'running': return 'pi-spin pi-spinner'
    case 'completed': return 'pi-check-circle'
    case 'failed': return 'pi-times-circle'
    default: return 'pi-circle'
  }
})

const label = computed(() => {
  if (props.rogue) return 'Rogue'
  return props.status
})
</script>
