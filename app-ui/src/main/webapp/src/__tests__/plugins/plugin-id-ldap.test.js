import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import registry from '@/plugins/registry.js'
// Imports the plugin source (pre-build). The built bundle at
// ../src/main/resources/.../webjars/id-ldap/vue/index.js is what the host
// loads at runtime — here we test the authoring surface directly.
import pluginIdLdapDef from '../../../../../../../../ligoj-plugins/plugin-id-ldap/ui/src/index.js'
import pluginIdDef from '../../../../../../../../ligoj-plugins/plugin-id/ui/src/index.js'

describe('plugin-id-ldap contract', () => {
  it('exports required fields (id, label, install, feature, service, meta)', () => {
    expect(pluginIdLdapDef.id).toBe('id-ldap')
    expect(typeof pluginIdLdapDef.label).toBe('string')
    expect(typeof pluginIdLdapDef.install).toBe('function')
    expect(typeof pluginIdLdapDef.feature).toBe('function')
    expect(pluginIdLdapDef.service).toBeTypeOf('object')
    expect(pluginIdLdapDef.meta).toMatchObject({ icon: expect.any(String), color: expect.any(String) })
  })

  it('declares no routes — tool-level augmentation only', () => {
    expect(pluginIdLdapDef.routes).toBeUndefined()
  })

  it('feature() throws for unknown actions', () => {
    expect(() => pluginIdLdapDef.feature('unknown')).toThrow(/no feature "unknown"/)
  })

  it('renderFeatures() returns CSV-download VNodes when the group is set', () => {
    setActivePinia(createPinia())
    const result = pluginIdLdapDef.feature('renderFeatures', {
      id: 42,
      node: { id: 'service:id:ldap:foo' },
      parameters: { 'service:id:group': 'engineering' },
    })
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
    for (const node of result) expect(node.__v_isVNode).toBe(true)
    // Both buttons carry a download href that points at the LDAP activity endpoint.
    const hrefs = result.map((n) => n.props?.href).filter(Boolean)
    expect(hrefs.every((h) => h.includes('/rest/service/id/ldap/activity/42/'))).toBe(true)
    expect(hrefs.some((h) => h.startsWith === undefined ? false : true)).toBe(true)
    expect(hrefs.some((h) => h.includes('/group-engineering-'))).toBe(true)
    expect(hrefs.some((h) => h.includes('/project-engineering-'))).toBe(true)
  })

  it('renderFeatures() returns an empty list when no group is set', () => {
    setActivePinia(createPinia())
    const result = pluginIdLdapDef.feature('renderFeatures', {
      id: 42,
      node: { id: 'service:id:ldap:foo' },
      parameters: {},
    })
    expect(result).toEqual([])
  })
})

describe('plugin-id delegation to plugin-id-ldap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registry.register('id-ldap', pluginIdLdapDef)
  })

  afterEach(() => {
    registry.remove('id-ldap')
  })

  it('appends id-ldap activity buttons to plugin-id renderFeatures output', () => {
    const result = pluginIdDef.feature('renderFeatures', {
      id: 7,
      node: { id: 'service:id:ldap:local' },
      parameters: { 'service:id:group': 'engineering' },
    })
    // plugin-id contributes one base button (manage) + 0..1 help, plus the
    // two LDAP-contributed activity buttons. With no `help` parameter set
    // we expect 1 (manage) + 2 (LDAP) = 3 VNodes.
    expect(result.length).toBe(3)
    for (const node of result) expect(node.__v_isVNode).toBe(true)
  })

  it('does not delegate when the subscription is not on an LDAP node', () => {
    const result = pluginIdDef.feature('renderFeatures', {
      id: 7,
      // Different tool segment — sub-plugin lookup resolves to `id-other`
      // which isn't registered, so the parent's output is unchanged.
      node: { id: 'service:id:other:local' },
      parameters: { 'service:id:group': 'engineering' },
    })
    expect(result.length).toBe(1)
  })
})
