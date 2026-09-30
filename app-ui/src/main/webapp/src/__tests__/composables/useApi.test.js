import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useApi } from '@/composables/useApi.js'

describe('useApi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('get sends GET request and returns JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ id: 1, name: 'Test' }),
    })

    const api = useApi()
    const result = await api.get('rest/project/1')

    expect(globalThis.fetch).toHaveBeenCalledWith('rest/project/1', expect.objectContaining({
      credentials: 'include',
    }))
    expect(result).toEqual({ id: 1, name: 'Test' })
  })

  it('surfaces the X-Ligoj-Warning headers of a successful answer as localized warning toasts', async () => {
    const { useI18nStore } = await import('@/stores/i18n.js')
    useI18nStore().merge({ 'warning.jenkins-folder-roles-skipped': 'Plug-in {plugin} missing: roles of {folder} skipped' }, 'en')
    const coded = encodeURIComponent(JSON.stringify({ code: 'jenkins-folder-roles-skipped', parameters: { plugin: 'role-strategy', folder: 'folder6/folder6.1' } }))
    const unknown = encodeURIComponent(JSON.stringify({ code: 'no-such-code', parameters: { a: 'b' } }))
    const headers = { 'content-type': 'application/json', 'x-ligoj-warning': `${coded},${unknown},Plain%20text%20warning` }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: { get: (k) => headers[String(k).toLowerCase()] ?? null },
      json: () => Promise.resolve(42),
    })
    const api = useApi()
    expect(await api.post('rest/subscription', { node: 'x' })).toBe(42)
    const { useErrorStore } = await import('@/stores/error.js')
    const warnings = useErrorStore().errors.filter((e) => e.severity === 'warning').map((e) => e.message)
    // Coded + localized, coded without message (code and parameters shown), plain text kept as is
    expect(warnings).toEqual(['Plug-in role-strategy missing: roles of folder6/folder6.1 skipped', 'no-such-code (a: b)', 'Plain text warning'])
  })

  it('post sends POST with JSON body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(42),
    })

    const api = useApi()
    const result = await api.post('rest/project', { name: 'New', pkey: 'NEW' })

    expect(globalThis.fetch).toHaveBeenCalledWith('rest/project', expect.objectContaining({
      method: 'POST',
      body: '{"name":"New","pkey":"NEW"}',
    }))
    expect(result).toBe(42)
  })

  it('put sends PUT with JSON body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
    })

    const api = useApi()
    const result = await api.put('rest/project', { id: 1, name: 'Updated' })

    expect(globalThis.fetch).toHaveBeenCalledWith('rest/project', expect.objectContaining({
      method: 'PUT',
      body: '{"id":1,"name":"Updated"}',
    }))
    expect(result).toBeNull() // 204
  })

  it('del sends DELETE request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
    })

    const api = useApi()
    const result = await api.del('rest/project/1')

    expect(globalThis.fetch).toHaveBeenCalledWith('rest/project/1', expect.objectContaining({
      method: 'DELETE',
    }))
    expect(result).toBeNull()
  })

  it('returns null on error response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
      json: () => Promise.resolve({ message: 'Not found' }),
    })

    const api = useApi()
    const result = await api.get('rest/project/999')

    expect(result).toBeNull()
  })
})
