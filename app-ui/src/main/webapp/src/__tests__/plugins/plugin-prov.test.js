import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import registry, { callFeature } from '@/plugins/registry.js'
// Imports the plugin source (pre-build). The built bundle at
// ../src/main/resources/.../webjars/prov/vue/index.js is what the host loads
// at runtime — here we test the authoring surface directly.
import pluginProvDef from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/index.js'

describe('plugin-prov contract', () => {
  it('exports required fields (id, label, install, feature, service, meta)', () => {
    expect(pluginProvDef.id).toBe('prov')
    expect(typeof pluginProvDef.label).toBe('string')
    expect(typeof pluginProvDef.install).toBe('function')
    expect(typeof pluginProvDef.feature).toBe('function')
    expect(pluginProvDef.service).toBeTypeOf('object')
    expect(pluginProvDef.meta).toMatchObject({ icon: expect.any(String), color: expect.any(String) })
  })

  it('feature() throws for unknown actions', () => {
    expect(() => pluginProvDef.feature('unknown-action')).toThrow(/no feature "unknown-action"/)
  })

  it('install() registers all /prov/* routes on the given router', () => {
    setActivePinia(createPinia())
    const addRoute = vi.fn()
    pluginProvDef.install({ pluginId: 'prov', router: { addRoute } })
    const registered = addRoute.mock.calls.map(([route]) => route.path)
    expect(registered).toEqual(expect.arrayContaining([
      '/prov/currency',
      '/prov/catalog',
      '/prov/terraform',
      '/prov/network',
      '/prov/quote/:subscription',
    ]))
    expect(registered).toHaveLength(5)
  })

  it('feature("requestCatalogUpdate") POSTs to the catalog endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    await pluginProvDef.feature('requestCatalogUpdate', 'service:prov:aws')
    expect(fetchSpy).toHaveBeenCalledWith(
      '/rest/service/prov/catalog/service%3Aprov%3Aaws',
      expect.objectContaining({ method: 'POST' }),
    )
    fetchSpy.mockRestore()
  })

  it('feature("requestCatalogUpdate") with force=true appends the query string', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    await pluginProvDef.feature('requestCatalogUpdate', 'service:prov:aws', { force: true })
    expect(fetchSpy).toHaveBeenCalledWith(
      '/rest/service/prov/catalog/service%3Aprov%3Aaws?force=true',
      expect.objectContaining({ method: 'POST' }),
    )
    fetchSpy.mockRestore()
  })
})

describe('plugin-prov via callFeature()', () => {
  beforeEach(() => { registry.register('prov', pluginProvDef) })
  afterEach(() => { registry.remove('prov') })

  it('dispatches through the shared registry', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    const result = await callFeature('prov', 'requestCatalogUpdate', 'service:prov:aws')
    expect(result).toBe(true)
    fetchSpy.mockRestore()
  })
})
