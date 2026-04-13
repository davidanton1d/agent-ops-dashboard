<template>
  <div class="min-h-screen" style="background: var(--bg-deep)">
    <!-- Header -->
    <header class="sticky top-0 z-50" style="background: rgba(10, 14, 23, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-subtle);">
      <div class="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-3 no-underline group">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--accent-cyan-dim); border: 1px solid rgba(34, 211, 238, 0.3);">
            <i class="pi pi-bolt" style="color: var(--accent-cyan); font-size: 0.9rem;"></i>
          </div>
          <div>
            <span class="text-base font-bold tracking-tight" style="font-family: var(--font-display); color: var(--text-primary);">
              Agent Ops
            </span>
            <span class="ml-2 text-xs font-medium" style="font-family: var(--font-mono); color: var(--text-muted); letter-spacing: 0.05em;">
              MISSION CONTROL
            </span>
          </div>
        </router-link>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);">
            <span class="status-dot running"></span>
            <span>SCANNER ACTIVE</span>
          </div>
          <button class="ops-btn flex items-center gap-2" @click="triggerScan">
            <i class="pi pi-refresh" style="font-size: 0.7rem;"></i>
            <span>Scan Now</span>
          </button>
        </div>
      </div>
    </header>

    <main class="px-8 py-8">
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
