import { describe, it, expect, afterEach, vi } from 'vitest'
import { h } from 'vue'
import registry from '@/plugins/registry.js'
import { toolPluginId, delegateFeature } from '@/plugins/delegate.js'

describe('toolPluginId()', () => {
  it('derives <service>-<tool> from a node id', () => {
    expect(toolPluginId({ node: { id: 'service:bt:jira:1' } })).toBe('bt-jira')
    expect(toolPluginId({ node: { id: 'service:vm:aws:i-1' } })).toBe('vm-aws')
    expect(toolPluginId({ node: { id: 'service:id:ldap' } })).toBe('id-ldap')
  })

  it('returns null without a tool segment', () => {
    expect(toolPluginId({ node: { id: 'service:bt' } })).toBeNull()
    expect(toolPluginId({ node: { id: '' } })).toBeNull()
    expect(toolPluginId({})).toBeNull()
    expect(toolPluginId(null)).toBeNull()
  })
})

describe('delegateFeature()', () => {
  afterEach(() => {
    registry.remove('bt-jira')
    vi.restoreAllMocks()
  })

  it('returns [] when no sub-plugin is registered', () => {
    expect(delegateFeature({ node: { id: 'service:bt:jira:1' } }, 'renderFeatures')).toEqual([])
  })

  it('normalises a single VNode to an array', () => {
    registry.register('bt-jira', { id: 'bt-jira', install: () => {}, feature: () => h('span', {}, 'one') })
    const out = delegateFeature({ node: { id: 'service:bt:jira:1' } }, 'renderDetailsKey')
    expect(out).toHaveLength(1)
    expect(out[0].__v_isVNode).toBe(true)
  })

  it('passes through an array result and a null → []', () => {
    registry.register('bt-jira', {
      id: 'bt-jira', install: () => {},
      feature: (action) => (action === 'a' ? [h('i'), h('i')] : null),
    })
    expect(delegateFeature({ node: { id: 'service:bt:jira:1' } }, 'a')).toHaveLength(2)
    expect(delegateFeature({ node: { id: 'service:bt:jira:1' } }, 'b')).toEqual([])
  })

  it('swallows an unknown-feature error silently', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    registry.register('bt-jira', {
      id: 'bt-jira', install: () => {},
      feature: (action) => { throw new Error(`Plugin "bt-jira" has no feature "${action}"`) },
    })
    expect(delegateFeature({ node: { id: 'service:bt:jira:1' } }, 'renderFeatures')).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })

  it('surfaces a real error under the [plugin:<label>] scope', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    registry.register('bt-jira', {
      id: 'bt-jira', install: () => {},
      feature: () => { throw new Error('boom') },
    })
    expect(delegateFeature({ node: { id: 'service:bt:jira:1' } }, 'renderFeatures', 'bt')).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('[plugin:bt]')
  })
})
