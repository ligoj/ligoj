import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useErrorStore = defineStore('error', () => {
  let nextId = 0
  const errors = ref([])

  /**
   * Push a notification onto the snackbar stack. Accepts either a plain
   * message string or `{ message, status, severity, timeout }`.
   * `severity` defaults to 'error' so existing callers keep their
   * behaviour; pass 'success' / 'info' / 'warning' for non-error
   * confirmations. Auto-dismiss is faster for non-errors.
   */
  function push(entry) {
    const e = typeof entry === 'string' ? { message: entry } : (entry || {})
    const severity = e.severity || 'error'
    const item = {
      id: ++nextId,
      message: e.message || 'Unknown error',
      status: e.status || null,
      severity,
      timestamp: Date.now(),
    }
    errors.value.push(item)
    const timeout = e.timeout ?? (severity === 'error' ? 8000 : 4000)
    if (timeout > 0) setTimeout(() => dismiss(item.id), timeout)
    return item.id
  }

  /** Shortcut: green confirmation snackbar. */
  function success(message, opts = {}) {
    return push({ ...opts, message, severity: 'success' })
  }

  /** Shortcut: blue informational snackbar. */
  function info(message, opts = {}) {
    return push({ ...opts, message, severity: 'info' })
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

  return { errors, push, success, info, dismiss, clear, handleResponse }
})
