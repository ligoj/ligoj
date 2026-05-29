import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'
import { useAuthStore } from '@/stores/auth.js'

/**
 * Error store — central handler for non-2xx responses from `useApi`.
 *
 * Ported from the legacy `error.mod.js` (jQuery + Handlebars + RequireJS
 * NLS). Same status-code matrix and JSON body shape so a backend payload
 * `{ code: "<i18n-key>", message: "...", parameters: [...], cause: {...} }`
 * resolves through the host's vue-i18n store directly.
 *
 * Two public surfaces:
 *   - Toasts: `push / success / info` (unchanged) and the auto-toasted
 *     output of `handleResponse(response)`.
 *   - Field-level validation errors: `validationErrors` is a reactive
 *     Map<fieldId, Array<{rule, parameters, message}>> that forms can
 *     subscribe to via `errorsFor(fieldId)`. Cleared at the start of
 *     every `handleResponse` call so a successful retry wipes stale
 *     state.
 */
export const useErrorStore = defineStore('error', () => {
  let nextId = 0
  const errors = ref([])

  /**
   * Field-level validation errors keyed by JSON property path. Wrapped
   * in a `shallowRef` of a Map so updates are tracked by identity (we
   * always replace the Map wholesale rather than mutating in place).
   */
  const validationErrors = shallowRef(new Map())

  /**
   * Push a notification onto the snackbar stack. Accepts either a plain
   * message string or `{ message, status, severity, timeout, details }`.
   * `severity` defaults to 'error'; pass 'success' / 'info' / 'warning'
   * for non-error confirmations. `details` is rendered as an expandable
   * section under the message (used for the legacy "technical cause"
   * chain).
   */
  function push(entry) {
    const e = typeof entry === 'string' ? { message: entry } : (entry || {})
    const severity = e.severity || 'error'
    const item = {
      id: ++nextId,
      message: e.message || 'Unknown error',
      title: e.title || null,
      details: e.details || null,
      status: e.status || null,
      severity,
      timestamp: Date.now(),
    }
    errors.value.push(item)
    const timeout = e.timeout ?? (severity === 'error' ? 8000 : 4000)
    if (timeout > 0) setTimeout(() => dismiss(item.id), timeout)
    return item.id
  }

  function success(message, opts = {}) {
    return push({ ...opts, message, severity: 'success' })
  }

  function info(message, opts = {}) {
    return push({ ...opts, message, severity: 'info' })
  }

  function dismiss(id) {
    errors.value = errors.value.filter(e => e.id !== id)
  }

  function clear() {
    errors.value = []
  }

  function clearValidationErrors() {
    validationErrors.value = new Map()
  }

  /** Vue 3-friendly selector: returns the array (or empty array) for a field. */
  function errorsFor(fieldId) {
    return computed(() => validationErrors.value.get(fieldId) || [])
  }

  /* --------------- legacy parity helpers --------------- */

  /**
   * Resolve an i18n key with safe fall-through: the catalog uses
   * `error.*` keys, but a backend `code` may also be the raw string
   * (e.g. `"business-down"`). Try `error.<code>` first, then the bare
   * `<code>`, then the literal as a last resort so the UI never shows
   * a placeholder-looking message.
   */
  function tCode(code) {
    if (!code) return ''
    const i18n = useI18nStore()
    const candidates = [`error.${code}`, code]
    for (const k of candidates) {
      const v = i18n.t(k)
      if (v && v !== k) return v
    }
    return code
  }

  /**
   * Compose an i18n message with the backend's `parameters`. The
   * backend may send parameters as an array (legacy `{{[0]}}`-style),
   * as a key/value map (`{from: ..., to: ...}`), or both. We support
   * both shapes by feeding them through vue-i18n's named-argument
   * interpolation; for the array case we expose `{0}`, `{1}`, … and
   * also `{this}` aliased to the first element to match the legacy
   * `Handlebars.compile(template)(value)` convention where a scalar
   * input was the implicit context.
   */
  function tMessage(code, parameters) {
    const i18n = useI18nStore()
    const key = code ? `error.${code}` : 'error.unknownCode'
    const raw = i18n.t(key)
    const template = (raw && raw !== key) ? raw : i18n.t('error.unknownCode')

    if (!parameters) return template
    const args = {}
    if (Array.isArray(parameters)) {
      // Resolve any parameter values that are themselves i18n keys
      // (the legacy passed `["service:id:group", "sample group"]`
      // where each item could be looked up via $messages.error.*).
      parameters.forEach((p, i) => {
        const resolved = typeof p === 'string' ? tCode(p) : p
        args[i] = resolved
        if (i === 0) args.this = resolved
      })
    } else if (typeof parameters === 'object') {
      for (const [k, v] of Object.entries(parameters)) {
        args[k] = typeof v === 'string' ? tCode(v) : v
      }
    }
    return i18n.t(key, args)
  }

  /**
   * Walk the cause chain and return a plain-text representation. The
   * legacy version produced an HTML toggle (`<span class="…">[…]</span>`);
   * we keep it as a newline-joined string the snackbar can render in a
   * collapsible details slot.
   */
  function buildCauseChain(cause) {
    const lines = []
    let c = cause
    while (c && c.message) {
      lines.push(c.message)
      c = c.cause
    }
    return lines.length ? lines.join('\n› ') : null
  }

  /** Detect the JSR-303 / `{ errors: { field: [...] } }` shape. */
  function hasFieldErrors(body) {
    return body && body.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)
  }

  /**
   * Hydrate the `validationErrors` map from a JSR-303 body. Each entry
   * keeps the raw `rule` and any `parameters` plus a pre-resolved
   * `message` so a form can render the field error without re-calling
   * `tMessage` per field.
   */
  function ingestFieldErrors(body) {
    const map = new Map()
    for (const [field, list] of Object.entries(body.errors || {})) {
      const arr = (Array.isArray(list) ? list : [list]).map(e => {
        const rule = e?.rule
        const parameters = e?.parameters
        return {
          rule,
          parameters,
          message: tMessage(`rule.${rule}`, parameters) || tCode(rule),
        }
      })
      map.set(field, arr)
    }
    validationErrors.value = map
  }

  /**
   * Try to parse the body once. Returns `{ json, text }` so callers
   * can branch on shape without re-reading the stream.
   */
  async function readBody(response) {
    try {
      const text = await response.clone().text()
      if (!text) return { json: null, text: '' }
      try {
        return { json: JSON.parse(text), text }
      } catch {
        return { json: null, text }
      }
    } catch {
      return { json: null, text: '' }
    }
  }

  /* --------------- the central response handler --------------- */

  async function handleResponse(response) {
    if (response.ok) return response

    // `x-redirect` short-circuits everything else. Spring's
    // `RestRedirectStrategy` emits this on 401-derived redirects so
    // XHR callers can bounce to the IdP without parsing HTML.
    const redirect = response.headers?.get?.('x-redirect')
    if (redirect) {
      handleRedirect(redirect)
      return response
    }

    // Clear stale validation state at the start of each request so a
    // successful retry doesn't leave the previous failure's fields
    // marked as invalid.
    clearValidationErrors()

    const status = response.status
    const { json, text } = await readBody(response)
    const i18n = useI18nStore()

    /* ------------- 0 / network -------------- */
    if (status === 0) {
      // jQuery surfaced `status === 0` for "no response". Fetch maps
      // network failure to a thrown error, but a CORS-blocked
      // opaqueredirect or aborted request can still produce a 0.
      if (response.type !== 'opaqueredirect') {
        push({ message: i18n.t('error.0') })
      }
      return response
    }

    /* ------------- 400 ---------------------- */
    if (status === 400) {
      if (json && hasFieldErrors(json)) {
        ingestFieldErrors(json)
        // Build a single toast summarising the first field's first rule
        // so the user gets visible feedback even when no form is
        // listening for `validationErrors`.
        const firstField = Object.keys(json.errors)[0]
        const firstRule = (Array.isArray(json.errors[firstField]) ? json.errors[firstField][0] : json.errors[firstField])?.rule
        const summary = tMessage(`rule.${firstRule}`, json.errors[firstField][0]?.parameters)
        push({
          title: i18n.t('error.400'),
          message: `${firstField}: ${summary || firstRule || ''}`.trim(),
          status,
        })
        return response
      }
      if (json && json.code) {
        // Technical bad request — `{code, message, parameters, cause}`.
        pushBusinessError(json, status)
        return response
      }
      push({
        title: i18n.t('error.400'),
        message: text || i18n.t('error.unknownCode'),
        status,
      })
      return response
    }

    /* ------------- 401 ---------------------- */
    if (status === 401) {
      // The backend tells us *how* to recover via the body's `redirect`
      // field (legacy `error.mod.js#handleRedirect`):
      //   - "local"      → local provider: pop the in-page login dialog
      //                    so the user can re-authenticate without
      //                    losing their current page state.
      //   - "<path>"     → OIDC provider: Spring shipped the IdP entry
      //                    URL; top-level-navigate so the browser runs
      //                    the cross-origin OAuth flow.
      //   - absent       → no recovery hint: fall back to the SPA root,
      //                    which re-runs `fetchSession()` and handles
      //                    the OIDC short-circuit there.
      // Same dispatch is also triggered by the `x-redirect` header
      // higher up — this branch covers the response-body variant the
      // legacy code path used.
      const bodyRedirect = json?.redirect
      if (bodyRedirect) {
        handleRedirect(bodyRedirect)
        if (bodyRedirect === 'local') {
          // Pin the toast: we don't auto-dismiss it because it should
          // stay visible behind/under the dialog until the user
          // re-authenticates (matches the legacy `-1` timeout).
          push({
            title: i18n.t('error.401'),
            message: i18n.t('error.401-details'),
            status,
            timeout: 0,
          })
        }
        return response
      }
      push({
        title: i18n.t('error.401'),
        message: i18n.t('error.401-details'),
        status,
      })
      const base = import.meta.env.BASE_URL || '/'
      window.location.href = base
      return response
    }

    /* ------------- 403 ---------------------- */
    if (status === 403) {
      push({
        title: i18n.t('error.403'),
        message: i18n.t('error.403-details'),
        status,
      })
      return response
    }

    /* ------------- 404 / 405 ---------------- */
    if (status === 404 || status === 405) {
      if (json && json.code === 'entity') {
        push({
          title: i18n.t('error.404-data-title'),
          message: i18n.t('error.404-entity', { this: json.message ?? '' }),
          status,
        })
        return response
      }
      if (json && json.code === 'data') {
        push({
          title: i18n.t('error.404-data-title'),
          message: i18n.t('error.404-data', { this: json.message ?? '' }),
          status,
        })
        return response
      }
      const url = trimUrl(response.url)
      push({
        title: i18n.t('error.404'),
        message: i18n.t('error.404-details', { this: url }),
        status,
      })
      return response
    }

    /* ------------- 412 ---------------------- */
    if (status === 412 && json) {
      const split = (json.message || '').split('/')
      if (json.code === 'integrity-foreign') {
        push({
          title: i18n.t('error.412'),
          message: i18n.t('error.412-foreign-details', { from: split[0] ?? '', to: split[1] ?? '' }),
          status, severity: 'warning',
        })
      } else if (json.code === 'integrity-unicity') {
        push({
          title: i18n.t('error.412'),
          message: i18n.t('error.412-unicity-details', { entry: split[0] ?? '', name: split[1] ?? '' }),
          status, severity: 'warning',
        })
      } else {
        push({
          title: i18n.t('error.412'),
          message: i18n.t('error.412-unknown-details'),
          status, severity: 'warning',
        })
      }
      return response
    }

    /* ------------- 415 ---------------------- */
    if (status === 415) {
      push({
        title: i18n.t('error.415'),
        message: i18n.t('error.415-details'),
        status,
      })
      return response
    }

    /* ------------- 500 ---------------------- */
    if (status === 500) {
      if (json && json.code) {
        pushBusinessError(json, status)
      } else {
        push({ message: i18n.t('error.500'), status })
      }
      return response
    }

    /* ------------- 503 ---------------------- */
    if (status === 503) {
      if (json && json.code) {
        push({
          title: i18n.t('error.503'),
          message: tCode(json.code),
          details: buildCauseChain(json.cause),
          status,
        })
      } else {
        push({
          title: i18n.t('error.503'),
          message: i18n.t('error.404-details', { this: trimUrl(response.url) }),
          status,
        })
      }
      return response
    }

    /* ------------- 501, > 500 generic ------- */
    if (status > 500) {
      push({
        title: i18n.t(`error.${status}`) || i18n.t('error.500'),
        message: i18n.t(`error.${status}-details`) || '',
        status,
      })
      return response
    }

    /* ------------- everything else ---------- */
    if (text) {
      push({
        title: `${i18n.t('error.unknownCode')} (${status})`,
        message: `${i18n.t('error.message')} : ${text}`,
        status,
      })
    } else {
      push({
        title: `${i18n.t('error.unknownCode')} (${status})`,
        message: i18n.t('error.business-down'),
        status,
      })
    }
    return response
  }

  /**
   * Format the toast for a `{code, message, parameters, cause}` payload
   * from the backend. The `severity` reflects whether the backend tagged
   * this as a "business" (user-actionable) vs technical error.
   */
  function pushBusinessError(body, status) {
    const i18n = useI18nStore()
    const message = tMessage(body.code, body.parameters) || body.message || i18n.t('error.unknownCode')
    const severity = body.code === 'business' ? 'info' : 'error'
    push({
      title: tCode(body.code),
      message,
      details: buildCauseChain(body.cause),
      status,
      severity,
    })
  }

  /**
   * Drop the query string from the response URL so the toast stays
   * readable. Mirrors the legacy `_trimUrl`.
   */
  function trimUrl(url) {
    if (!url) return ''
    const q = url.indexOf('?')
    return q >= 0 ? url.substring(0, q) : url
  }

  /**
   * Same-origin redirect honoured here; cross-origin gets dropped to
   * avoid open-redirect abuse. The legacy `'local'` token maps to
   * `useAuthStore.openAuthPrompt()` — the host's in-page login dialog
   * (mounted in `App.vue`) — so the user can re-authenticate without
   * losing the page they're on.
   */
  function handleRedirect(redirect) {
    if (redirect === 'local') {
      useAuthStore().openAuthPrompt()
      return
    }
    try {
      const url = new URL(redirect, window.location.origin)
      if (url.origin === window.location.origin) {
        window.location.href = url.href
      }
    } catch {
      // Invalid URL — ignore.
    }
  }

  return {
    errors, validationErrors,
    push, success, info, dismiss, clear,
    clearValidationErrors, errorsFor,
    handleResponse,
  }
})
