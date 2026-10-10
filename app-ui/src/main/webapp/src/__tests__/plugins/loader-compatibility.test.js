/*
 * The loader never imports a plugin bundle needing exports this host lacks: the browser would refuse to link it and
 * the plugin would vanish. A bundle it cannot read loads as before.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { loadPlugin } from '@/plugins/loader.js'
import { registerHostModules, pluginIncompatibility, IncompatiblePluginError, _resetCompatibility } from '@/plugins/compatibility.js'

const bundle = (names) => `import { ${names.map((name, i) => `${name} as a${i}`).join(', ')} } from "@ligoj/host";\nexport default { id: "x", install() {} };\n`
const respond = (source) => vi.fn(async () => ({ ok: true, status: 200, text: async () => source }))

beforeEach(() => {
  setActivePinia(createPinia())
  _resetCompatibility()
  registerHostModules({ '@ligoj/host': { useI18nStore: 1 } })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'debug').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks() })

describe('loadPlugin and the host compatibility', () => {
  it('never imports a bundle needing exports this host lacks', async () => {
    globalThis.fetch = respond(bundle(['useI18nStore', 'remoteSearchField']))
    const error = await loadPlugin('incompatible-a').catch((e) => e)
    expect(error).toBeInstanceOf(IncompatiblePluginError)
    expect(error.missing).toEqual({ '@ligoj/host': ['remoteSearchField'] })
    expect(String(fetch.mock.calls[0][0])).toMatch(/\/main\/incompatible-a\/vue\/index\.js/)
    expect(pluginIncompatibility('incompatible-a')).toEqual({ missing: { '@ligoj/host': ['remoteSearchField'] } })
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.error).not.toHaveBeenCalled()
  })

  it('does not read again a bundle found incompatible', async () => {
    globalThis.fetch = respond(bundle(['remoteSearchField']))
    await loadPlugin('incompatible-b').catch(() => {})
    const again = await loadPlugin('incompatible-b').catch((e) => e)
    expect(again).toBeInstanceOf(IncompatiblePluginError)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('imports as before a bundle it cannot read', async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    // The import itself fails in the test environment: the usual load error, not an incompatibility
    const error = await loadPlugin('unreadable-c').catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(IncompatiblePluginError)
    expect(pluginIncompatibility('unreadable-c')).toBeNull()
  })
})
