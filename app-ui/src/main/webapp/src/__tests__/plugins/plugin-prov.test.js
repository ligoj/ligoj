import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import registry, { callFeature } from '@/plugins/registry.js'
// Imports the plugin source (pre-build). The built bundle at
// ../src/main/resources/.../webjars/prov/vue/index.js is what the host loads
// at runtime — here we test the authoring surface directly.
import pluginProvDef, { service as provService } from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/index.js'

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

  it('feature("renderFeatures") returns VNodes the host can mount', () => {
    setActivePinia(createPinia())
    const result = pluginProvDef.feature('renderFeatures', { id: 7, node: { id: 'service:prov:aws:bar' } })
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    for (const node of result) {
      expect(node.__v_isVNode).toBe(true)
    }
  })

  it('feature("renderDetailsKey") returns chips when a quote is present', () => {
    setActivePinia(createPinia())
    const result = pluginProvDef.feature('renderDetailsKey', {
      id: 7,
      node: { id: 'service:prov:aws:bar' },
      data: {
        quote: {
          nbInstances: 3,
          nbDatabases: 1,
          totalCpu: 12,
          totalRam: 32768,
          totalStorage: 2048,
          location: { name: 'eu-west-1' },
        },
      },
    })
    expect(result).toBeTruthy()
    expect(result.__v_isVNode).toBe(true)
  })

  it('feature("renderDetailsKey") returns null when no quote data exists', () => {
    setActivePinia(createPinia())
    expect(pluginProvDef.feature('renderDetailsKey', { id: 7, node: { id: 'service:prov:aws:bar' } })).toBeNull()
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

  it('exposes the same `service` object via the default export and the named export', () => {
    expect(provService).toBe(pluginProvDef.service)
    // Sanity-check a couple of well-known members so the named export
    // stays a reliable entry point for direct ES consumers.
    expect(typeof provService.requestCatalogUpdate).toBe('function')
    expect(typeof provService.scheduleTaskPoll).toBe('function')
    expect(typeof provService.renderFeatures).toBe('function')
    expect(typeof provService.renderDetailsKey).toBe('function')
  })

  it('feature("scheduleTaskPoll") returns a handle and clears the interval on done', async () => {
    vi.useFakeTimers()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ end: true, finished: true, result: 'ok' }),
    })
    const onPartial = vi.fn()
    const onDone = vi.fn()
    const handle = pluginProvDef.feature('scheduleTaskPoll', 'fake-url', onPartial, onDone, 1000)
    expect(handle).toBeTruthy()
    // First interval tick — polling fires once.
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(onPartial).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
    // Now that `end: true` came back, the timer should be cleared —
    // a second advance must NOT trigger any more fetches.
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    clearInterval(handle)
    fetchSpy.mockRestore()
    vi.useRealTimers()
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
