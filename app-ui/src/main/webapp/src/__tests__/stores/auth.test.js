import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('starts unauthenticated', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.userName).toBe('')
    expect(store.roles).toEqual([])
    expect(store.isAdmin).toBe(false)
  })

  it('fetchSession sets session on success', async () => {
    const sessionData = {
      userName: 'admin',
      roles: ['ADMIN', 'USER'],
      uiAuthorizations: ['.*'],
      apiAuthorizations: [],
      applicationSettings: { buildVersion: '4.0.1', plugins: [] },
    }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sessionData),
    })

    const store = useAuthStore()
    const ok = await store.fetchSession()

    expect(ok).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.userName).toBe('admin')
    expect(store.isAdmin).toBe(true)
  })

  it('fetchSession returns false on failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

    const store = useAuthStore()
    const ok = await store.fetchSession()

    expect(ok).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  it('fetchSession returns false on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const store = useAuthStore()
    const ok = await store.fetchSession()

    expect(ok).toBe(false)
  })

  it('logout clears session', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        userName: 'admin',
        roles: ['USER'],
        uiAuthorizations: [],
        apiAuthorizations: [],
        applicationSettings: {},
      }),
    })

    const store = useAuthStore()
    await store.fetchSession()
    expect(store.isAuthenticated).toBe(true)

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await store.logout()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAllowed checks uiAuthorizations', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        userName: 'user1',
        roles: ['USER'],
        uiAuthorizations: ['^home.*', '^id/user.*'],
        apiAuthorizations: [],
        applicationSettings: {},
      }),
    })

    const store = useAuthStore()
    await store.fetchSession()

    expect(store.isAllowed('home/project')).toBe(true)
    expect(store.isAllowed('id/user')).toBe(true)
    expect(store.isAllowed('admin')).toBe(false)
  })

  it('isAllowed returns true for admin', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        userName: 'admin',
        roles: ['ADMIN'],
        uiAuthorizations: [],
        apiAuthorizations: [],
        applicationSettings: {},
      }),
    })

    const store = useAuthStore()
    await store.fetchSession()

    expect(store.isAllowed('anything')).toBe(true)
  })

  it('navItems filters by uiAuthorizations', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        userName: 'user1',
        roles: ['USER'],
        uiAuthorizations: ['^home.*', '^$'],
        apiAuthorizations: [],
        applicationSettings: {},
      }),
    })

    const store = useAuthStore()
    await store.fetchSession()

    const ids = store.navItems.map(n => n.id)
    expect(ids).toContain('home')
    expect(ids).toContain('project')
    expect(ids).not.toContain('id') // no id/* authorization
  })
})
