import { describe, it, expect } from 'vitest'
import { useDemoMode } from '../../composables/useDemoMode.js'

describe('useDemoMode', () => {
  it('is a shared reactive flag persisted in localStorage', () => {
    const a = useDemoMode()
    const b = useDemoMode()
    a.setEnabled(true)
    expect(b.enabled.value).toBe(true)
    expect(window.localStorage.getItem('ligoj-demo-mode')).toBe('true')
    b.setEnabled(false)
    expect(a.enabled.value).toBe(false)
    expect(window.localStorage.getItem('ligoj-demo-mode')).toBe('false')
  })
})
