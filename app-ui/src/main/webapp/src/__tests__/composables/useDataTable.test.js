import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataTable } from '@/composables/useDataTable.js'

const DEMO = [
  { id: 'alice', name: 'Alice', company: 'Acme' },
  { id: 'bob', name: 'Bob', company: 'Acme' },
  { id: 'charlie', name: 'Charlie', company: 'Beta' },
  { id: 'diana', name: 'Diana', company: 'Beta' },
  { id: 'eve', name: 'Eve', company: 'Gamma' },
]

/**
 * Minimal Response-shaped stub. `useDataTable` now routes failures
 * through `useErrorStore.handleResponse`, which expects:
 *   - `headers.get(name)` (looks for `x-redirect`)
 *   - `clone().text()`    (parses the body once for status branching)
 *   - `clone().json()`    (left to the data-table's own fallback path)
 * The stub mirrors those shapes so the mock can flow through both
 * the error-store handler AND the data-table's existing branches.
 */
function mockResponse({ status = 200, ok = status < 400, body = null, headers = {} } = {}) {
  const text = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body))
  const clone = () => ({
    ok, status,
    headers: { get: (h) => headers[h?.toLowerCase()] ?? headers[h] ?? null },
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body || 'null') : body),
  })
  return {
    ok, status, url: '', type: 'basic',
    headers: { get: (h) => headers[h?.toLowerCase()] ?? headers[h] ?? null },
    clone,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body || 'null') : body),
  }
}

describe('useDataTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('returns expected reactive refs', () => {
    const dt = useDataTable('test/endpoint')
    expect(dt.items.value).toEqual([])
    expect(dt.totalItems.value).toBe(0)
    expect(dt.loading.value).toBe(false)
    expect(dt.error.value).toBeNull()
    expect(dt.search.value).toBe('')
    expect(dt.demoMode.value).toBe(false)
  })

  it('load fetches data from API', async () => {
    const apiData = { recordsTotal: 2, recordsFiltered: 2, data: [{ id: 1 }, { id: 2 }] }
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ status: 200, body: apiData }))

    const dt = useDataTable('service/id/user')
    await dt.load({ page: 1, itemsPerPage: 25 })

    expect(globalThis.fetch).toHaveBeenCalledOnce()
    expect(dt.items.value).toEqual([{ id: 1 }, { id: 2 }])
    expect(dt.totalItems.value).toBe(2)
    expect(dt.loading.value).toBe(false)
  })

  it('falls back to demo data on "internal" error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ status: 500, body: { code: 'internal' } }))

    const dt = useDataTable('service/id/user', { demoData: DEMO })
    await dt.load({ page: 1, itemsPerPage: 3 })

    expect(dt.demoMode.value).toBe(true)
    expect(dt.items.value).toHaveLength(3)
    expect(dt.totalItems.value).toBe(5)
  })

  it('demo data supports client-side search', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ status: 500, body: { code: 'internal' } }))

    const dt = useDataTable('service/id/user', { demoData: DEMO, defaultSort: 'id' })
    dt.search.value = 'beta'
    await dt.load({ page: 1, itemsPerPage: 25 })

    expect(dt.demoMode.value).toBe(true)
    expect(dt.items.value).toHaveLength(2)
    expect(dt.items.value[0].id).toBe('charlie')
  })

  it('demo data supports client-side sort', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ status: 500, body: { code: 'internal' } }))

    const dt = useDataTable('service/id/user', { demoData: DEMO })
    await dt.load({ page: 1, itemsPerPage: 25, sortBy: [{ key: 'name', order: 'desc' }] })

    expect(dt.items.value[0].name).toBe('Eve')
    expect(dt.items.value[4].name).toBe('Alice')
  })

  it('demo data supports pagination', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ status: 500, body: { code: 'internal' } }))

    const dt = useDataTable('service/id/user', { demoData: DEMO, defaultSort: 'id' })
    await dt.load({ page: 2, itemsPerPage: 2 })

    expect(dt.items.value).toHaveLength(2)
    expect(dt.items.value[0].id).toBe('charlie')
  })

  it('sets error on non-internal API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ status: 403, body: { message: 'Forbidden' } }))

    const dt = useDataTable('test/endpoint')
    await dt.load()

    expect(dt.error.value).toBe('Forbidden')
    expect(dt.items.value).toEqual([])
  })

  it('does not set an inline error on 401 (auth dialog handles it)', async () => {
    // 401 + body `{redirect:"local"}` should leave `dt.error` null
    // — the central handler now owns that UX via the in-page login
    // dialog. Setting an inline "HTTP 401" string on top would just
    // clutter the page behind the modal.
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({
      status: 401,
      body: { success: false, redirect: 'local' },
    }))

    const dt = useDataTable('test/endpoint')
    await dt.load()

    expect(dt.error.value).toBeNull()
    expect(dt.items.value).toEqual([])
  })

  it('sets error on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const dt = useDataTable('test/endpoint')
    await dt.load()

    expect(dt.error.value).toBe('Network error')
  })
})
