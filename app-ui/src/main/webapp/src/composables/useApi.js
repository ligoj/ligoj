import { useErrorStore } from '@/stores/error.js'
import { useI18nStore } from '@/stores/i18n.js'
import { codedWarningMessage } from '@/utils/codedWarning.js'

export function useApi() {
  const errorStore = useErrorStore()

  async function request(url, options = {}) {
    const { silent, raw, ...rest } = options
    const opts = {
      credentials: 'include',
      ...rest,
      headers: {
        ...(rest.body && typeof rest.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
    }

    const response = await fetch(url, opts)
    if (!silent) await errorStore.handleResponse(response)
    // Non-blocking warnings of a successful call (`X-Ligoj-Warning`, URL-encoded, comma-joined): the
    // API did the job but skipped or degraded a part, e.g. a plug-in missing on the target tool.
    if (response.ok) surfaceWarnings(response)
    // `raw` returns the Response itself so callers can branch on
    // `response.ok` — needed when the parsed body is ambiguous, e.g. a
    // 204 No Content success returns the same `null` as an error.
    if (raw) return response
    if (!response.ok) return null

    const ct = response.headers.get('content-type')
    if (ct && ct.includes('application/json')) return response.json()
    if (response.status === 204) return null
    return response.text()
  }

  function surfaceWarnings(response) {
    const raw = response.headers?.get?.('x-ligoj-warning')
    if (!raw) return
    const i18n = useI18nStore()
    for (const part of String(raw).split(',')) {
      const text = part.trim()
      if (!text) continue
      let decoded = text
      try { decoded = decodeURIComponent(text) } catch { /* not encoded: shown as is */ }
      errorStore.push({ message: warningMessage(decoded, i18n), severity: 'warning', title: i18n.t('common.warning') })
    }
  }

  /**
   * Text of one warning: a coded JSON payload (`{code, parameters}`) is localized through the plugin bundles
   * (`warning.<code>`), shown as `code (k: v)` when no bundle knows it; anything else is a plain sentence.
   */
  function warningMessage(decoded, i18n) {
    if (!decoded.startsWith('{')) return decoded
    let payload
    try { payload = JSON.parse(decoded) } catch { return decoded }
    return codedWarningMessage(payload, i18n) || decoded
  }

  function get(url, options) {
    return request(url, options)
  }

  function post(url, data, options) {
    return request(url, {
      ...options,
      method: 'POST',
      body: data != null ? JSON.stringify(data) : undefined,
    })
  }

  function put(url, data, options) {
    return request(url, {
      ...options,
      method: 'PUT',
      body: data != null ? JSON.stringify(data) : undefined,
    })
  }

  function del(url, options) {
    return request(url, { ...options, method: 'DELETE' })
  }

  function upload(url, formData, options) {
    return request(url, {
      ...options,
      method: 'POST',
      body: formData,
    })
  }

  return { get, post, put, del, upload, request }
}
