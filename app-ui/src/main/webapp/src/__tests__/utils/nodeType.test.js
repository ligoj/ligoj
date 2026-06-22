import { describe, it, expect } from 'vitest'
import { nodeType, isInstance, nodePluginId } from '@/utils/nodeType.js'

/**
 * Ligoj node ids follow `<service|feature>:<service>[:<tool>[:<instance>]]`.
 * The three helpers split that string differently — this file pins the
 * mapping so future refactors don't accidentally redefine "instance".
 */
describe('nodeType', () => {
  it('returns "instance" for 4+ segments', () => {
    expect(nodeType('service:scm:git:gitlab-1')).toBe('instance')
    expect(nodeType('service:prov:aws:my-acct')).toBe('instance')
    expect(nodeType({ id: 'service:foo:bar:baz' })).toBe('instance')
    // 5 segments still counts as instance.
    expect(nodeType('service:a:b:c:d')).toBe('instance')
  })

  it('returns "tool" for exactly 3 segments', () => {
    expect(nodeType('service:scm:git')).toBe('tool')
    expect(nodeType({ id: 'service:prov:aws' })).toBe('tool')
  })

  it('returns "service" for 2 segments starting with service', () => {
    expect(nodeType('service:id')).toBe('service')
    expect(nodeType({ id: 'service:prov' })).toBe('service')
  })

  it('returns "feature" for 2 segments starting with feature', () => {
    expect(nodeType('feature:foo')).toBe('feature')
    expect(nodeType({ id: 'feature:reporting' })).toBe('feature')
  })

  it('handles edge inputs without throwing', () => {
    expect(nodeType(null)).toBe('service')
    expect(nodeType(undefined)).toBe('service')
    expect(nodeType('')).toBe('service')
    expect(nodeType({})).toBe('service')
  })

  it('accepts both a string id and a node object', () => {
    expect(nodeType('service:prov:aws:x')).toBe(nodeType({ id: 'service:prov:aws:x' }))
  })
})

describe('isInstance', () => {
  it('is true only for 4+-segment ids', () => {
    expect(isInstance('service:prov:aws:bar')).toBe(true)
    expect(isInstance('service:prov:aws')).toBe(false)
    expect(isInstance('service:prov')).toBe(false)
    expect(isInstance('feature:foo')).toBe(false)
    expect(isInstance(null)).toBe(false)
  })

  it('accepts node objects', () => {
    expect(isInstance({ id: 'service:scm:git:internal' })).toBe(true)
    expect(isInstance({ id: 'service:scm:git' })).toBe(false)
  })
})

describe('nodePluginId (regression — already covered alongside PluginFeatures)', () => {
  it('still extracts the plugin id segment', () => {
    expect(nodePluginId('service:prov')).toBe('prov')
    expect(nodePluginId('service:prov:aws:x')).toBe('prov')
    expect(nodePluginId('feature:reporting')).toBe('reporting')
    expect(nodePluginId('')).toBeNull()
  })
})
