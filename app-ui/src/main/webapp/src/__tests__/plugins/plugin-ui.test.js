import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import registry, { callFeature } from '@/plugins/registry.js'
import pluginUiDef from '../../../../../../../../ligoj-plugins/plugin-ui/ui/src/index.js'

describe('plugin-ui contract', () => {
  it('exports required fields', () => {
    expect(pluginUiDef.id).toBe('ui')
    expect(typeof pluginUiDef.label).toBe('string')
    expect(typeof pluginUiDef.install).toBe('function')
    expect(typeof pluginUiDef.feature).toBe('function')
    expect(pluginUiDef.service).toBeTypeOf('object')
    expect(pluginUiDef.meta).toMatchObject({ icon: expect.any(String), color: expect.any(String) })
  })

  it('feature("sample") returns the stub string', () => {
    expect(pluginUiDef.feature('sample')).toMatch(/sample feature called/)
  })

  it('feature() throws for unknown actions', () => {
    expect(() => pluginUiDef.feature('unknown-action')).toThrow(/no feature "unknown-action"/)
  })

  it('install() registers all expected routes on the given router', () => {
    const addRoute = vi.fn()
    pluginUiDef.install({ pluginId: 'ui', router: { addRoute } })
    const registered = addRoute.mock.calls.map(([route]) => route.path)
    expect(registered).toEqual(expect.arrayContaining([
      '/home', '/home/project', '/home/project/:id', '/home/manual',
      '/system', '/system/user', '/system/role', '/system/plugin',
      '/system/node', '/system/cache', '/system/bench',
      '/api', '/api/token',
      '/subscribe',
    ]))
    expect(registered.length).toBeGreaterThanOrEqual(14)
  })
})

describe('plugin-ui via callFeature()', () => {
  beforeEach(() => { registry.register('ui', pluginUiDef) })
  afterEach(() => { registry.remove('ui') })

  it('dispatches through the shared registry', () => {
    expect(callFeature('ui', 'sample')).toMatch(/sample feature called/)
  })
})
