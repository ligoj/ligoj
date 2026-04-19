import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import registry, { callFeature } from '@/plugins/registry.js'
// Imports the plugin source (pre-build). The built bundle at
// ../src/main/resources/.../webjars/id/vue/index.js is what the host loads
// at runtime — here we test the authoring surface directly.
import pluginIdDef from '../../../../../../../../ligoj-plugins/plugin-id/ui/src/index.js'

describe('plugin-id contract', () => {
  it('exports required fields (id, label, install, feature, service, meta)', () => {
    expect(pluginIdDef.id).toBe('id')
    expect(typeof pluginIdDef.label).toBe('string')
    expect(typeof pluginIdDef.install).toBe('function')
    expect(typeof pluginIdDef.feature).toBe('function')
    expect(pluginIdDef.service).toBeTypeOf('object')
    expect(pluginIdDef.meta).toMatchObject({ icon: expect.any(String), color: expect.any(String) })
  })

  it('feature("requireAgreement") returns true when agreement not accepted', () => {
    expect(pluginIdDef.feature('requireAgreement', null)).toBe(true)
    expect(pluginIdDef.feature('requireAgreement', {})).toBe(true)
  })

  it('feature("requireAgreement") returns false when already accepted', () => {
    expect(pluginIdDef.feature('requireAgreement', { 'security-agreement': true })).toBe(false)
  })

  it('feature() throws for unknown actions', () => {
    expect(() => pluginIdDef.feature('unknown-action')).toThrow(/no feature "unknown-action"/)
  })

  it('install() registers the plugin routes on the given router', () => {
    const addRoute = vi.fn()
    pluginIdDef.install({ pluginId: 'id', router: { addRoute } })
    expect(addRoute).toHaveBeenCalled()
    const registered = addRoute.mock.calls.map(([route]) => route.path)
    expect(registered).toContain('/id/container-scope')
  })

  it('feature("acceptAgreement") POSTs and flips the user setting', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    const settings = {}
    const result = await pluginIdDef.feature('acceptAgreement', settings)
    expect(result).toBe(true)
    expect(settings['security-agreement']).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/rest/system/setting/security-agreement/1',
      expect.objectContaining({ method: 'POST' }),
    )
    fetchSpy.mockRestore()
  })
})

describe('callFeature()', () => {
  beforeEach(() => {
    registry.register('id', pluginIdDef)
  })

  afterEach(() => {
    registry.remove('id')
  })

  it('dispatches to a registered plugin feature', () => {
    expect(callFeature('id', 'requireAgreement', { 'security-agreement': true })).toBe(false)
  })

  it('throws when the plugin is not registered', () => {
    expect(() => callFeature('missing-plugin', 'x')).toThrow(/not registered/)
  })

  it('throws when the plugin has no feature function', () => {
    registry.register('noop', { id: 'noop', install: () => {} })
    expect(() => callFeature('noop', 'x')).toThrow(/does not expose a feature/)
    registry.remove('noop')
  })
})
