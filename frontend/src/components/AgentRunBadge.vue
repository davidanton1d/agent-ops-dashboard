<template>
  <span :class="['badge', badgeClass]">
    <span v-if="props.status === 'running' && !props.rogue" class="status-dot running" style="width:5px;height:5px;"></span>
    <span v-else-if="props.rogue" class="status-dot rogue" style="width:5px;height:5px;"></span>
    <i v-else :class="['pi', iconClass]" style="font-size: 0.6rem"></i>
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
  switch (props.status) {
    case 'completed': return 'pi-check'
    case 'failed': return 'pi-times'
    default: return 'pi-circle'
  }
})

const label = computed(() => {
  if (props.rogue) return 'Rogue'
  return props.status
})
</script>
