import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDemoMode } from '../../composables/useDemoMode.js'
import { useAuthStore } from '../../stores/auth.js'

describe('useDemoMode', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('is a shared reactive flag persisted in localStorage, visible to administrators', () => {
    useAuthStore().session = { admin: true }
    const a = useDemoMode()
    const b = useDemoMode()
    a.setEnabled(true)
    expect(b.enabled.value).toBe(true)
    expect(b.stored.value).toBe(true)
    expect(window.localStorage.getItem('ligoj-demo-mode')).toBe('true')
    b.setEnabled(false)
    expect(a.enabled.value).toBe(false)
    expect(window.localStorage.getItem('ligoj-demo-mode')).toBe('false')
  })

  it('is never visible to a non-administrator, even with the flag stored (visual gating, not security)', () => {
    const auth = useAuthStore()
    auth.session = { admin: false, roles: ['USER'] }
    const demo = useDemoMode()
    demo.setEnabled(true)
    expect(demo.stored.value).toBe(true)
    expect(demo.enabled.value).toBe(false)
    // Reactive on the session: the same browser flag lights up for an administrator
    auth.session = { admin: true }
    expect(demo.enabled.value).toBe(true)
    demo.setEnabled(false)
  })
})
