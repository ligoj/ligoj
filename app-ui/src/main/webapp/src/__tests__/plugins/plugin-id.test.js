import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
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

  it('install() registers all /id/* routes on the given router', () => {
    setActivePinia(createPinia())
    const addRoute = vi.fn()
    pluginIdDef.install({ pluginId: 'id', router: { addRoute } })
    const registered = addRoute.mock.calls.map(([route]) => route.path)
    expect(registered).toEqual(expect.arrayContaining([
      // Users now edit through a dialog (UserEditDialog) opened from
      // the list, so /id/user/new and /id/user/:id are no longer routes.
      '/id/user',
      '/id/group', '/id/group/new', '/id/group/:id',
      '/id/company', '/id/company/new', '/id/company/:id',
      '/id/delegate', '/id/delegate/new', '/id/delegate/:id',
      '/id/container-scope',
    ]))
    expect(registered).toHaveLength(11)
  })

  it('feature("renderFeatures") returns VNodes the host can mount', () => {
    setActivePinia(createPinia())
    const result = pluginIdDef.feature('renderFeatures', { id: 42, node: { id: 'service:id:ldap:foo' } })
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // VNodes have a __v_isVNode flag in Vue 3.
    for (const node of result) {
      expect(node.__v_isVNode).toBe(true)
    }
  })

  it('feature("renderDetailsKey") returns a chip VNode when members are present', () => {
    setActivePinia(createPinia())
    const result = pluginIdDef.feature('renderDetailsKey', {
      id: 42,
      node: { id: 'service:id:ldap:foo' },
      data: { members: 12 },
    })
    expect(result).toBeTruthy()
    expect(result.__v_isVNode).toBe(true)
  })

  it('feature("renderDetailsKey") returns null when there are no details to show', () => {
    setActivePinia(createPinia())
    const result = pluginIdDef.feature('renderDetailsKey', {
      id: 42,
      node: { id: 'service:id:ldap:foo' },
      data: {},
    })
    expect(result).toBeNull()
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
