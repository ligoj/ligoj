import { useErrorStore } from '@/stores/error.js'

/**
 * Shared clipboard helper. Wraps `navigator.clipboard.writeText` with:
 *   - the legacy hidden-textarea fallback for browsers / contexts where
 *     the async API is unavailable (older Safari, non-secure dev pages,
 *     iframes without the `clipboard-write` permission)
 *   - a confirmation toast pushed onto the host's notification store
 *     ("Copied to clipboard" by default) so users see the action took
 *     effect, and a warning toast on failure
 *
 * Usage:
 *   import { useClipboard } from '@ligoj/host'
 *   const { copy } = useClipboard()
 *   await copy(someText)                       // → "Copied to clipboard"
 *   await copy(someText, { message: 'API key copied' })
 *   await copy(someText, { message: null })    // silent
 */
export function useClipboard() {
  const store = useErrorStore()

  async function copy(text, { message = 'Copied to clipboard' } = {}) {
    if (text == null || text === '') return false
    const value = String(text)

    let ok = false
    try {
      await navigator.clipboard.writeText(value)
      ok = true
    } catch {
      ok = legacyTextareaCopy(value)
    }

    if (ok && message) {
      store.success(message)
    } else if (!ok) {
      store.push({
        message: 'Could not copy to clipboard',
        severity: 'warning',
      })
    }
    return ok
  }

  return { copy }
}

function legacyTextareaCopy(value) {
  if (typeof document === 'undefined') return false
  const ta = document.createElement('textarea')
  ta.value = value
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '-1000px'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try { ok = !!document.execCommand?.('copy') } catch { /* ignore */ }
  ta.remove()
  return ok
}
