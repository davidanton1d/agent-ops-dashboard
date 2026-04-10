<template>
  <div class="grid grid-cols-4 gap-4">
    <div v-for="col in columns" :key="col.status" class="min-w-0">
      <h2 class="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3 px-1">
        {{ col.label }}
        <span class="ml-1 text-xs font-normal">({{ col.items.length }})</span>
      </h2>
      <div class="space-y-0">
        <WorkItemCard v-for="item in col.items" :key="item.id" :item="item" />
        <p v-if="!col.items.length" class="text-xs text-gray-400 px-1">No items</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import WorkItemCard from './WorkItemCard.vue'

const props = defineProps({
  items: { type: Array, required: true },
})

const columns = computed(() => [
  { status: 'todo', label: 'Todo', items: props.items.filter(i => i.status === 'todo') },
  { status: 'in_progress', label: 'In Progress', items: props.items.filter(i => i.status === 'in_progress') },
  { status: 'blocked', label: 'Blocked', items: props.items.filter(i => i.status === 'blocked') },
  { status: 'done', label: 'Done', items: props.items.filter(i => i.status === 'done') },
])
</script>
