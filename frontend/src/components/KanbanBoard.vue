<template>
  <div class="grid grid-cols-4 gap-5">
    <div v-for="col in columns" :key="col.status" class="min-w-0">
      <!-- Column header -->
      <div class="ops-col-header">
        <span class="status-dot" :class="col.dotClass"></span>
        <span>{{ col.label }}</span>
        <span class="count">{{ col.items.length }}</span>
      </div>

      <!-- Column track -->
      <div class="space-y-0 min-h-[100px] rounded-lg p-2" style="background: rgba(17, 24, 39, 0.4);">
        <WorkItemCard
          v-for="(item, idx) in col.items"
          :key="item.id"
          :item="item"
          :index="idx"
        />
        <div v-if="!col.items.length" class="flex items-center justify-center h-20 rounded-lg" style="border: 1px dashed var(--border-subtle);">
          <span style="font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-muted); letter-spacing: 0.05em; text-transform: uppercase;">
            Empty
          </span>
        </div>
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
  { status: 'todo', label: 'Queued', dotClass: '', items: props.items.filter(i => i.status === 'todo') },
  { status: 'in_progress', label: 'Active', dotClass: 'running', items: props.items.filter(i => i.status === 'in_progress') },
  { status: 'blocked', label: 'Blocked', dotClass: 'rogue', items: props.items.filter(i => i.status === 'blocked') },
  { status: 'done', label: 'Complete', dotClass: 'completed', items: props.items.filter(i => i.status === 'done') },
])
</script>
