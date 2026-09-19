import { describe, it, expect } from 'vitest'
import { eagerPlugins, isPluginInstalled, REQUIRED_PLUGINS } from '@/plugins/eager-plugins.js'

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

describe('isPluginInstalled — guard of the lazy loader', () => {
  const data = 'feature:ui,service:build,service:build:jenkins,service:id,service:id:ldap,feature:password'

  it('knows the plugins the session lists, by their loader id', () => {
    expect(isPluginInstalled('build', data)).toBe(true)
    expect(isPluginInstalled('build-jenkins', data)).toBe(true)
    expect(isPluginInstalled('id-ldap', data)).toBe(true)
    expect(isPluginInstalled('password', data)).toBe(true)
  })

  it('rejects a plugin absent from the list: disabled, removed or never installed', () => {
    expect(isPluginInstalled('prov', data)).toBe(false)
    expect(isPluginInstalled('qa', data)).toBe(false)
    expect(isPluginInstalled('scm-gitlab', data)).toBe(false)
    expect(isPluginInstalled('id', '')).toBe(false) // an empty list is a known list
  })

  it('counts an unknown state as installed, so an older backend keeps the previous behaviour', () => {
    expect(isPluginInstalled('prov', null)).toBe(true)
    expect(isPluginInstalled('prov', undefined)).toBe(true)
  })
})
