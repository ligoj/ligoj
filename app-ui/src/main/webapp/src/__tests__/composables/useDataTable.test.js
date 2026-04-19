import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDataTable } from '@/composables/useDataTable.js'

const DEMO = [
  { id: 'alice', name: 'Alice', company: 'Acme' },
  { id: 'bob', name: 'Bob', company: 'Acme' },
  { id: 'charlie', name: 'Charlie', company: 'Beta' },
  { id: 'diana', name: 'Diana', company: 'Beta' },
  { id: 'eve', name: 'Eve', company: 'Gamma' },
]

describe('useDataTable', () => {
  beforeEach(() => {
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
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(apiData),
    })

    const dt = useDataTable('service/id/user')
    await dt.load({ page: 1, itemsPerPage: 25 })

    expect(globalThis.fetch).toHaveBeenCalledOnce()
    expect(dt.items.value).toEqual([{ id: 1 }, { id: 2 }])
    expect(dt.totalItems.value).toBe(2)
    expect(dt.loading.value).toBe(false)
  })

  it('falls back to demo data on "internal" error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ code: 'internal' }),
    })

    const dt = useDataTable('service/id/user', { demoData: DEMO })
    await dt.load({ page: 1, itemsPerPage: 3 })

    expect(dt.demoMode.value).toBe(true)
    expect(dt.items.value).toHaveLength(3)
    expect(dt.totalItems.value).toBe(5)
  })

  it('demo data supports client-side search', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ code: 'internal' }),
    })

    const dt = useDataTable('service/id/user', { demoData: DEMO, defaultSort: 'id' })
    dt.search.value = 'beta'
    await dt.load({ page: 1, itemsPerPage: 25 })

    expect(dt.demoMode.value).toBe(true)
    expect(dt.items.value).toHaveLength(2)
    expect(dt.items.value[0].id).toBe('charlie')
  })

  it('demo data supports client-side sort', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ code: 'internal' }),
    })

    const dt = useDataTable('service/id/user', { demoData: DEMO })
    await dt.load({ page: 1, itemsPerPage: 25, sortBy: [{ key: 'name', order: 'desc' }] })

    expect(dt.items.value[0].name).toBe('Eve')
    expect(dt.items.value[4].name).toBe('Alice')
  })

  it('demo data supports pagination', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ code: 'internal' }),
    })

    const dt = useDataTable('service/id/user', { demoData: DEMO, defaultSort: 'id' })
    await dt.load({ page: 2, itemsPerPage: 2 })

    expect(dt.items.value).toHaveLength(2)
    expect(dt.items.value[0].id).toBe('charlie')
  })

  it('sets error on non-internal API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: 'Forbidden' }),
    })

    const dt = useDataTable('test/endpoint')
    await dt.load()

    expect(dt.error.value).toBe('Forbidden')
    expect(dt.items.value).toEqual([])
  })

  it('sets error on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const dt = useDataTable('test/endpoint')
    await dt.load()

    expect(dt.error.value).toBe('Network error')
  })
})
