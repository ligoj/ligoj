import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { reportError, __resetErrorReporterState } from '@/plugins/errorReporter.js'

function okResponse() {
  return { ok: true, status: 204, headers: { get: () => null } }
}

function lastPostBody() {
  const call = globalThis.fetch.mock.calls.at(-1)
  return JSON.parse(call[1].body)
}

describe('errorReporter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    __resetErrorReporterState()
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse())
    window.location.hash = ''
  })

  it('posts to rest/user-log, truncates the message to 2000 chars and sends a domain-less url', () => {
    window.location.hash = '#/test'
    reportError('x'.repeat(2500))

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('rest/user-log')
    expect(opts.method).toBe('POST')

    const body = JSON.parse(opts.body)
    expect(body.message).toHaveLength(2000)
    expect(body.url).toBe('#/test')
    // No scheme / domain leaked into the reported url.
    expect(body.url).not.toMatch(/^https?:\/\//)
  })

  it('coerces non-string messages and falls back to pathname when no hash', () => {
    reportError(new Error('boom').message)
    const body = lastPostBody()
    expect(body.message).toBe('boom')
    expect(body.url).toBe('/')
  })

  it('deduplicates an identical message sent repeatedly within the window', () => {
    reportError('same error')
    reportError('same error')
    reportError('same error')

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('still sends distinct messages', () => {
    reportError('error A')
    reportError('error B')

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('is fire-and-forget: does not throw when the API call rejects', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    expect(() => reportError('will fail to send')).not.toThrow()
    // Let the rejected post settle; the internal .catch must swallow it.
    await Promise.resolve()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
