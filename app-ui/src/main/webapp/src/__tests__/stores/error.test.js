import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useErrorStore } from '@/stores/error.js'

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

  it('handleResponse does nothing for ok response', async () => {
    const store = useErrorStore()
    const resp = { ok: true, status: 200 }
    const result = await store.handleResponse(resp)
    expect(result).toBe(resp)
    expect(store.errors).toHaveLength(0)
  })

  it('handleResponse pushes error for non-ok response', async () => {
    const store = useErrorStore()
    const resp = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => null },
      json: () => Promise.resolve({ message: 'Server crashed' }),
    }
    await store.handleResponse(resp)
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0].message).toBe('Server crashed')
  })
})
