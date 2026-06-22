import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useClipboard } from '@/composables/useClipboard.js'
import { useErrorStore } from '@/stores/error.js'

describe('useClipboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('writes via navigator.clipboard and pushes a success notification', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })

    const store = useErrorStore()
    const { copy } = useClipboard()
    const ok = await copy('hello')

    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].severity).toBe('success')
    expect(store.errors[0].message).toBe('Copied to clipboard')
  })

  it('respects a custom message and skips the toast when message is null', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true,
    })
    const store = useErrorStore()
    const { copy } = useClipboard()

    await copy('x', { message: 'API key copied' })
    expect(store.errors[0].message).toBe('API key copied')

    await copy('y', { message: null })
    // No new entry — only the previous one is still in the buffer
    expect(store.errors).toHaveLength(1)
  })

  it('returns false and stays silent when text is empty', async () => {
    const writeText = vi.fn()
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })
    const store = useErrorStore()
    const { copy } = useClipboard()

    expect(await copy('')).toBe(false)
    expect(await copy(null)).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
    expect(store.errors).toHaveLength(0)
  })

  it('falls back to the textarea path and pushes a warning when both fail', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    // jsdom doesn't define execCommand by default — install a stub the
    // composable can call (and we can assert was called) on the document.
    const exec = vi.fn(() => false)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })

    const store = useErrorStore()
    const { copy } = useClipboard()
    const ok = await copy('value')

    expect(ok).toBe(false)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].severity).toBe('warning')

    delete document.execCommand
  })
})
