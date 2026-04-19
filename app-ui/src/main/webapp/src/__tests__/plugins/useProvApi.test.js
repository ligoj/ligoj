import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn().mockResolvedValue({})
const mockPost = vi.fn().mockResolvedValue({})
const mockPut = vi.fn().mockResolvedValue({})
const mockDel = vi.fn().mockResolvedValue({})

vi.mock('@/composables/useApi.js', () => ({
  useApi: () => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    del: mockDel,
  })
}))

import { useProvApi } from '@/plugins/prov/useProvApi.js'

describe('useProvApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getQuote calls get with correct URL', async () => {
    const api = useProvApi()
    await api.getQuote(123)
    expect(mockGet).toHaveBeenCalledWith('rest/service/prov/123')
  })

  it('getResources calls get with type in URL', async () => {
    const api = useProvApi()
    await api.getResources(123, 'instance')
    expect(mockGet).toHaveBeenCalledWith('rest/service/prov/123/instance')
  })

  it('createResource calls post', async () => {
    const api = useProvApi()
    const resource = { name: 'test', cpu: 2 }
    await api.createResource(123, 'instance', resource)
    expect(mockPost).toHaveBeenCalledWith('rest/service/prov/123/instance', resource)
  })

  it('deleteResource calls del', async () => {
    const api = useProvApi()
    await api.deleteResource(123, 'instance', 456)
    expect(mockDel).toHaveBeenCalledWith('rest/service/prov/123/instance/456')
  })

  it('getCatalogs calls get', async () => {
    const api = useProvApi()
    await api.getCatalogs()
    expect(mockGet).toHaveBeenCalledWith('rest/service/prov/catalog')
  })

  it('getCurrencies calls get', async () => {
    const api = useProvApi()
    await api.getCurrencies()
    expect(mockGet).toHaveBeenCalledWith('rest/service/prov/currency')
  })
})
