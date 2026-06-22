import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import registry from '@/plugins/registry.js'
import PluginFeatures from '@/components/PluginFeatures.vue'
import { nodePluginId } from '@/utils/nodeType.js'

describe('nodePluginId()', () => {
  it('extracts the plugin id from common node id shapes', () => {
    expect(nodePluginId({ id: 'service:id' })).toBe('id')
    expect(nodePluginId({ id: 'service:id:ldap' })).toBe('id')
    expect(nodePluginId({ id: 'service:prov:aws:foo' })).toBe('prov')
    expect(nodePluginId({ id: 'feature:foo' })).toBe('foo')
    expect(nodePluginId('service:scm:git:internal')).toBe('scm')
  })

  it('returns null for unrecognizable ids', () => {
    expect(nodePluginId({ id: '' })).toBeNull()
    expect(nodePluginId({ id: 'orphan' })).toBeNull()
    expect(nodePluginId(null)).toBeNull()
    expect(nodePluginId(undefined)).toBeNull()
  })
})

describe('<PluginFeatures>', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => {
    registry.remove('demo')
    registry.remove('throwing')
  })

  it('calls the resolved plugin\'s renderFeatures and mounts the returned VNodes', async () => {
    registry.register('demo', {
      id: 'demo',
      install: () => {},
      feature: (action, sub) => {
        if (action !== 'renderFeatures') throw new Error(`Plugin "demo" has no feature "${action}"`)
        return [h('span', { class: 'demo-feature' }, `sub-${sub.id}`)]
      },
    })

    const wrapper = mount(PluginFeatures, {
      props: { subscription: { id: 99, node: { id: 'service:demo' } } },
    })
    await nextTick()
    expect(wrapper.html()).toContain('demo-feature')
    expect(wrapper.text()).toContain('sub-99')
  })

  it('renders nothing for an unknown plugin', () => {
    const wrapper = mount(PluginFeatures, {
      props: { subscription: { node: { id: 'service:unknown-xyz' } } },
    })
    // setup() returning null produces an empty render (no comment placeholder).
    expect(wrapper.html()).toBe('')
  })

  it('renders nothing when the plugin does not implement renderFeatures', () => {
    registry.register('demo', {
      id: 'demo',
      install: () => {},
      feature: (action) => { throw new Error(`Plugin "demo" has no feature "${action}"`) },
    })
    const wrapper = mount(PluginFeatures, {
      props: { subscription: { id: 1, node: { id: 'service:demo' } } },
    })
    // setup() returning null produces an empty render.
    expect(wrapper.html()).toBe('')
  })

  it('dispatches the configured action (defaults to renderFeatures)', async () => {
    const called = []
    registry.register('demo', {
      id: 'demo',
      install: () => {},
      feature: (action, sub) => {
        called.push(action)
        if (action === 'renderFeatures') return [h('span', { class: 'feat' }, `f-${sub.id}`)]
        if (action === 'renderDetailsKey') return [h('span', { class: 'det' }, `d-${sub.id}`)]
        throw new Error(`Plugin "demo" has no feature "${action}"`)
      },
    })

    const sub = { id: 3, node: { id: 'service:demo' } }
    const features = mount(PluginFeatures, { props: { subscription: sub } })
    const details = mount(PluginFeatures, { props: { subscription: sub, action: 'renderDetailsKey' } })
    await nextTick()

    expect(features.html()).toContain('feat')
    expect(features.text()).toContain('f-3')
    expect(details.html()).toContain('det')
    expect(details.text()).toContain('d-3')
    expect(called).toEqual(expect.arrayContaining(['renderFeatures', 'renderDetailsKey']))
  })

  it('swallows exceptions from the plugin renderFeatures', () => {
    registry.register('throwing', {
      id: 'throwing',
      install: () => {},
      feature: () => { throw new Error('boom') },
    })
    const wrapper = mount(PluginFeatures, {
      props: { subscription: { id: 1, node: { id: 'service:throwing' } } },
    })
    // Doesn't propagate; renders nothing.
    // setup() returning null produces an empty render (no comment placeholder).
    expect(wrapper.html()).toBe('')
  })
})
