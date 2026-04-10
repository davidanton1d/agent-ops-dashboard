<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <router-link to="/" class="text-xl font-bold text-gray-900 no-underline">
        Agent Ops
      </router-link>
      <button
        class="px-3 py-1 bg-blue-600 text-white rounded text-sm cursor-pointer border-none"
        @click="triggerScan"
      >
        <i class="pi pi-refresh mr-1"></i> Scan Now
      </button>
    </header>
    <main class="p-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useApi } from './composables/useApi.js'
const { post } = useApi()
function triggerScan() {
  post('/api/scanner/trigger')
}
</script>
