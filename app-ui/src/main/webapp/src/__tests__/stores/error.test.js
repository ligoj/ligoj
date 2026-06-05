import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useErrorStore } from '@/stores/error.js'
import { useAuthStore } from '@/stores/auth.js'

describe('useErrorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('starts with empty errors', () => {
    const store = useErrorStore()
    expect(store.errors).toEqual([])
  })

  it('push adds an error with string message', () => {
    const store = useErrorStore()
    store.push('Something failed')
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].message).toBe('Something failed')
    expect(store.errors[0].id).toBeDefined()
  })

  it('push adds an error with object', () => {
    const store = useErrorStore()
    store.push({ message: 'Bad request', status: 400 })
    expect(store.errors[0].message).toBe('Bad request')
    expect(store.errors[0].status).toBe(400)
  })

  it('dismiss removes an error by id', () => {
    const store = useErrorStore()
    const id = store.push('error 1')
    store.push('error 2')
    expect(store.errors).toHaveLength(2)
    store.dismiss(id)
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].message).toBe('error 2')
  })

  it('clear removes all errors', () => {
    const store = useErrorStore()
    store.push('error 1')
    store.push('error 2')
    store.clear()
    expect(store.errors).toEqual([])
  })

  it('auto-dismisses after 8 seconds', () => {
    const store = useErrorStore()
    store.push('temp error')
    expect(store.errors).toHaveLength(1)
    vi.advanceTimersByTime(8000)
    expect(store.errors).toHaveLength(0)
  })

  it('default severity is "error"', () => {
    const store = useErrorStore()
    store.push('boom')
    expect(store.errors[0].severity).toBe('error')
  })

  it('success() pushes a success entry and auto-dismisses faster (4s)', () => {
    const store = useErrorStore()
    store.success('Saved')
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].severity).toBe('success')
    expect(store.errors[0].message).toBe('Saved')
    vi.advanceTimersByTime(4000)
    expect(store.errors).toHaveLength(0)
  })

  it('info() pushes an info entry', () => {
    const store = useErrorStore()
    store.info('FYI')
    expect(store.errors[0].severity).toBe('info')
  })

  it('explicit severity override on push() wins', () => {
    const store = useErrorStore()
    store.push({ message: 'oops', severity: 'warning' })
    expect(store.errors[0].severity).toBe('warning')
  })

  it('handleResponse does nothing for ok response', async () => {
    const store = useErrorStore()
    const resp = { ok: true, status: 200 }
    const result = await store.handleResponse(resp)
    expect(result).toBe(resp)
    expect(store.errors).toHaveLength(0)
  })

  /**
   * Build a minimal Response-like stub that mimics the bits the store
   * actually touches: `headers.get`, `clone().text()`, and the basic
   * properties (`ok`, `status`, `url`, `type`).
   */
  function mockResponse({ status = 200, ok = status < 400, body = '', headers = {}, url = '' } = {}) {
    const text = typeof body === 'string' ? body : JSON.stringify(body)
    return {
      ok, status, url, type: 'basic',
      headers: { get: (h) => headers[h?.toLowerCase()] ?? headers[h] ?? null },
      clone: () => ({ text: () => Promise.resolve(text) }),
      // Legacy helper retained for older tests / callers.
      json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body || 'null') : body),
    }
  }

  it('handleResponse does nothing for ok response', async () => {
    const store = useErrorStore()
    const resp = mockResponse({ status: 200, ok: true })
    const result = await store.handleResponse(resp)
    expect(result).toBe(resp)
    expect(store.errors).toHaveLength(0)
  })

  it('handleResponse surfaces a localised 500 when the body has no code', async () => {
    // Mirrors the legacy `error.mod.js` behaviour: a 500 without a
    // `code` field falls through to the generic `error.500` catalog
    // entry rather than echoing back arbitrary server text.
    const store = useErrorStore()
    await store.handleResponse(mockResponse({ status: 500, body: { message: 'Server crashed' } }))
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].message).toBe('Internal error')
    expect(store.errors[0].status).toBe(500)
  })

  it('handleResponse resolves a business `code` through the i18n catalog', async () => {
    const store = useErrorStore()
    await store.handleResponse(mockResponse({
      status: 500,
      body: { code: 'business-down', message: 'whatever' },
    }))
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].message).toBe('The business server is not available')
  })

  it('handleResponse hydrates validationErrors from a JSR-303 body', async () => {
    const store = useErrorStore()
    await store.handleResponse(mockResponse({
      status: 400,
      body: { errors: { 'service:id:group': [{ rule: 'group-type' }] } },
    }))
    const errs = store.validationErrors.get('service:id:group')
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('group-type')
    expect(errs[0].message).toBe('The selected group is not of type Project')
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].title).toBe('Validation error')
  })

  it('handleResponse maps a 412 integrity-unicity to the duplicate-entry toast', async () => {
    const store = useErrorStore()
    await store.handleResponse(mockResponse({
      status: 412,
      body: { code: 'integrity-unicity', message: '2003/PRIMARY' },
    }))
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].title).toBe('Data integrity')
    expect(store.errors[0].severity).toBe('warning')
    expect(store.errors[0].message).toBe('Unable to proceed this operation because of duplicate entry 2003 (PRIMARY)')
  })

  it('handleResponse handles integrity codes regardless of HTTP status (PostgreSQL 400/500)', async () => {
    // PostgreSQL flows can surface the mapper's integrity-unknown under a
    // non-412 status; it must still read as a data-integrity warning, with
    // the raw SQL kept in the expandable details rather than the message.
    const store = useErrorStore()
    await store.handleResponse(mockResponse({
      status: 400,
      body: {
        code: 'integrity-unknown',
        message: 'could not execute statement [ERROR: duplicate key ...]',
        cause: { message: 'ERROR: duplicate key value violates unique constraint "uk_x"' },
      },
    }))
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].title).toBe('Data integrity')
    expect(store.errors[0].severity).toBe('warning')
    expect(store.errors[0].message).toBe('Unable to proceed this operation because of an unknown data integrity issue')
    expect(store.errors[0].details).toBe('ERROR: duplicate key value violates unique constraint "uk_x"')
  })

  it('push carries a node so the snackbar can brand a confirmation', () => {
    const store = useErrorStore()
    const node = { id: 'service:prov:aws:test', name: 'AWS test' }
    store.success('Node saved', { node })
    expect(store.errors[0].severity).toBe('success')
    expect(store.errors[0].node).toEqual(node)
  })

  it('handleResponse maps 403 to the localised Authorization toast', async () => {
    const store = useErrorStore()
    await store.handleResponse(mockResponse({ status: 403 }))
    expect(store.errors[0].title).toBe('Authorization required')
    expect(store.errors[0].message).toBe('You don\'t have the authorizations to perform this action')
  })

  it('handleResponse builds a cause chain from nested causes', async () => {
    const store = useErrorStore()
    await store.handleResponse(mockResponse({
      status: 500,
      body: { code: 'technical', cause: { message: 'NPE', cause: { message: 'OOM' } } },
    }))
    expect(store.errors[0].details).toBe('NPE\n› OOM')
  })

  it('clearValidationErrors wipes the map', async () => {
    const store = useErrorStore()
    await store.handleResponse(mockResponse({
      status: 400,
      body: { errors: { foo: [{ rule: 'NotNull' }] } },
    }))
    expect(store.validationErrors.size).toBe(1)
    store.clearValidationErrors()
    expect(store.validationErrors.size).toBe(0)
  })

  it('errorsFor returns a reactive empty array when the field is clean', () => {
    const store = useErrorStore()
    const errs = store.errorsFor('unknown.field')
    expect(errs.value).toEqual([])
  })

  it('handleResponse opens the local auth prompt on 401 + {redirect:"local"}', async () => {
    // The legacy `error.mod.js#showAuthenticationAlert` flow: a 401 with
    // body `{success:false, redirect:"local"}` should pop the in-page
    // login dialog (driven by `auth.authPromptOpen`) instead of doing
    // a full-page nav. The toast that accompanies it must be persistent
    // (timeout 0) so it stays visible under the dialog.
    const store = useErrorStore()
    const auth = useAuthStore()
    expect(auth.authPromptOpen).toBe(false)
    await store.handleResponse(mockResponse({
      status: 401,
      body: { success: false, redirect: 'local' },
    }))
    expect(auth.authPromptOpen).toBe(true)
    expect(store.errors).toHaveLength(1)
    // Persistent toast (no auto-dismiss) — advancing well past the
    // default 8 s budget must not clear it.
    vi.advanceTimersByTime(60000)
    expect(store.errors).toHaveLength(1)
  })

  it('handleResponse follows a same-origin redirect from the 401 body', async () => {
    // OIDC path: Spring ships the IdP entry URL in `body.redirect`.
    // Same-origin paths should be honoured; cross-origin URLs are
    // silently dropped by `handleRedirect` (open-redirect guard).
    const navTo = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { origin: original.origin, href: '', protocol: 'http:', host: 'localhost' },
    })
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      set: navTo,
      get: () => '',
    })

    const store = useErrorStore()
    await store.handleResponse(mockResponse({
      status: 401,
      body: { success: false, redirect: '/oauth2/authorization/keycloak' },
    }))
    expect(navTo).toHaveBeenCalledWith(expect.stringContaining('/oauth2/authorization/keycloak'))
    // No dialog for OIDC — we top-level-navigate instead.
    const auth = useAuthStore()
    expect(auth.authPromptOpen).toBe(false)

    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: original })
  })
})
