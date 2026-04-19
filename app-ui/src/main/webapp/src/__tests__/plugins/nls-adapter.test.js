import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadNlsMessages } from '@/plugins/nls-adapter.js'

describe('NLS Adapter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns {} when fetch fails (root not found)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false
    })

    const result = await loadNlsMessages('test-plugin')
    expect(result).toEqual({})
  })

  it('parses root messages with double-quoted keys', async () => {
    const rootText = 'define({"hello": "world", "foo": "bar"})'

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(rootText)
    })

    const result = await loadNlsMessages('test-plugin')
    expect(result).toEqual({ hello: 'world', foo: 'bar' })
  })

  it('parses root messages with single-quoted keys', async () => {
    const rootText = "define({'greeting': 'hello', 'name': 'world'})"

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(rootText)
    })

    const result = await loadNlsMessages('test-plugin')
    expect(result).toEqual({ greeting: 'hello', name: 'world' })
  })

  it('parses root messages with unquoted keys', async () => {
    const rootText = 'define({title: "Page Title", description: "Some text"})'

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(rootText)
    })

    const result = await loadNlsMessages('test-plugin')
    expect(result).toEqual({ title: 'Page Title', description: 'Some text' })
  })

  it('handles trailing commas', async () => {
    const rootText = 'define({a: "1", b: "2",})'

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(rootText)
    })

    const result = await loadNlsMessages('test-plugin')
    expect(result).toEqual({ a: '1', b: '2' })
  })

  it('merges locale messages over root when locale is fr and rootData has fr: true', async () => {
    const rootText = 'define({root: {hello: "world", welcome: "Welcome"}, fr: true})'
    const frText = 'define({hello: "monde"})'

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(rootText)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(frText)
      })

    const result = await loadNlsMessages('test-plugin', 'fr')
    expect(result).toEqual({ hello: 'monde', welcome: 'Welcome' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/webjars/test-plugin/nls/messages.js', { credentials: 'include' })
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/webjars/test-plugin/nls/fr/messages.js', { credentials: 'include' })
  })

  it('returns root messages when locale is en (does not fetch locale file)', async () => {
    const rootText = 'define({root: {hello: "world"}, fr: true})'

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(rootText)
    })

    const result = await loadNlsMessages('test-plugin', 'en')
    expect(result).toEqual({ hello: 'world' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns {} when define block is malformed', async () => {
    const rootText = 'define(this is not valid javascript)'

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(rootText)
    })

    const result = await loadNlsMessages('test-plugin')
    expect(result).toEqual({})
  })
})
