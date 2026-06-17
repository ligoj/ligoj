import { useApi } from '@/composables/useApi.js'

// Browser error reporter: forwards JS errors to the backend `/rest/user-log`
// endpoint. It is intentionally defensive — a failing report must never
// cascade into another error, spam the server, or loop back onto itself.

const MAX_MESSAGE_LENGTH = 2000
const DEDUP_WINDOW_MS = 10_000
const THROTTLE_MAX = 10
const THROTTLE_WINDOW_MS = 60_000

// message -> timestamp (ms) of the last send, for de-duplication.
const recentMessages = new Map()
let throttleWindowStart = 0
let throttleCount = 0
// Anti-loop guard: true while a report is being dispatched, so an error
// raised by the reporting path itself is not captured again.
let reporting = false
let apiClient = null

function getApi() {
  // Lazily resolved: `useApi()` needs an active Pinia, which is only
  // guaranteed once the app has booted (well after module import).
  if (!apiClient) {
    apiClient = useApi()
  }
  return apiClient
}

/**
 * Report a single browser error to the backend. Fire-and-forget: this never
 * throws and never rejects to the caller.
 *
 * @param {*} message The error message (coerced to a string, capped at 2000 chars).
 */
export function reportError(message) {
  if (reporting) {
    return
  }
  reporting = true
  try {
    const text = String(message ?? '').slice(0, MAX_MESSAGE_LENGTH)
    const now = Date.now()

    // DEDUP: ignore an identical message already sent within the window.
    const last = recentMessages.get(text)
    if (last !== undefined && now - last < DEDUP_WINDOW_MS) {
      return
    }
    // Prune stale entries so the map stays bounded.
    for (const [key, ts] of recentMessages) {
      if (now - ts >= DEDUP_WINDOW_MS) {
        recentMessages.delete(key)
      }
    }

    // THROTTLE: cap the number of sends per rolling minute.
    if (now - throttleWindowStart >= THROTTLE_WINDOW_MS) {
      throttleWindowStart = now
      throttleCount = 0
    }
    if (throttleCount >= THROTTLE_MAX) {
      return
    }

    recentMessages.set(text, now)
    throttleCount++

    const payload = {
      message: text,
      // Path only, no domain — the hash carries the SPA route.
      url: window.location.hash || window.location.pathname || '/',
    }

    // FIRE-AND-FORGET: `silent` avoids the global error store reacting to a
    // failed log POST (which would itself be a cascade source).
    try {
      getApi().post('rest/user-log', payload, { silent: true }).catch(() => {})
    } catch {
      // Swallow any synchronous failure (e.g. API client unavailable).
    }
  } catch {
    // The reporter must never throw, whatever happens above.
  } finally {
    reporting = false
  }
}

/**
 * Install the global error hooks on the Vue app and the window.
 *
 * @param {import('vue').App} app The Vue application instance.
 */
export function installErrorReporter(app) {
  app.config.errorHandler = (err) => {
    reportError(err?.message || String(err))
    // Keep the default dev behaviour: surface the error in the console.
    console.error(err)
  }
  window.addEventListener('error', (e) => reportError(e?.error?.message || e?.message))
  window.addEventListener('unhandledrejection', (e) => reportError(e?.reason?.message || String(e?.reason)))
}

/**
 * Test-only helper: reset the internal dedup/throttle/anti-loop state.
 */
export function __resetErrorReporterState() {
  recentMessages.clear()
  throttleWindowStart = 0
  throttleCount = 0
  reporting = false
  apiClient = null
}
