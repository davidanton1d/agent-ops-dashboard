import { ref } from 'vue'

const BASE = ''

export function useApi() {
  const loading = ref(false)
  const error = ref(null)

  async function get(url) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(BASE + url)
      return await res.json()
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function post(url, body) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(BASE + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      return await res.json()
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function patch(url, body) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(BASE + url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return await res.json()
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  return { get, post, patch, loading, error }
}
