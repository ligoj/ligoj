import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useErrorStore = defineStore('error', () => {
  let nextId = 0
  const errors = ref([])

  function push(error) {
    const entry = {
      id: ++nextId,
      message: typeof error === 'string' ? error : error.message || 'Unknown error',
      status: error.status || null,
      timestamp: Date.now(),
    }
    errors.value.push(entry)
    setTimeout(() => dismiss(entry.id), 8000)
    return entry.id
  }

  function dismiss(id) {
    errors.value = errors.value.filter(e => e.id !== id)
  }

  function clear() {
    errors.value = []
  }

  async function handleResponse(response) {
    if (response.ok) return response

    const redirect = response.headers.get('x-redirect')
    if (redirect) {
      // Only allow same-origin redirects to prevent open redirect attacks
      try {
        const url = new URL(redirect, window.location.origin)
        if (url.origin === window.location.origin) {
          window.location.href = url.href
        }
      } catch {
        // Invalid URL — ignore redirect
      }
      return response
    }

    let message
    const status = response.status
    try {
      const body = await response.json()
      message = body.message || body.errors?.map(e => e.defaultMessage || e.message).join(', ')
    } catch {
      message = response.statusText
    }

    if (status === 401) {
      window.location.href = 'v-login.html'
      return response
    }

    push({ message: message || `HTTP ${status}`, status })
    return response
  }

  return { errors, push, dismiss, clear, handleResponse }
})
