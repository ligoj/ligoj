import { describe, it, expect } from 'vitest'
import { eagerPlugins, REQUIRED_PLUGINS } from '@/plugins/eager-plugins.js'

describe('eagerPlugins — core bundles loaded before mount', () => {
  it('loads only the required plugins the backend reports as installed', () => {
    expect(eagerPlugins('feature:ui,service:id:cognito,service:id')).toEqual(['id', 'ui'])
    expect(eagerPlugins('feature:ui,service:id,service:prov,service:prov:aws')).toEqual(['id', 'ui', 'prov'])
    expect(eagerPlugins('feature:ui')).toEqual(['ui'])
    expect(eagerPlugins('')).toEqual([])
  })

  it('falls back to every required plugin when the backend does not list its UI plugins', () => {
    expect(eagerPlugins(null)).toEqual(REQUIRED_PLUGINS)
    expect(eagerPlugins(undefined)).toEqual(REQUIRED_PLUGINS)
  })

  it('keeps the required order and ignores unrelated or malformed entries', () => {
    expect(eagerPlugins(' service:prov , feature:ui,,service:id ')).toEqual(['id', 'ui', 'prov'])
    expect(eagerPlugins('feature:ui', ['prov', 'ui'])).toEqual(['ui'])
  })
})
