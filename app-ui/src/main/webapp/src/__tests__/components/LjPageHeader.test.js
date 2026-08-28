import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import registry from '@/plugins/registry.js'
import LjPageHeader from '@/components/LjPageHeader.vue'

// A contributed toolbar action: renders the target + a context value it receives.
const FakeAction = {
  name: 'FakeAction',
  props: ['context'],
  template: '<button class="fake">{{ context.target }}:{{ context.selected?.length ?? 0 }}</button>',
}
const registered = []
function register(id, feature) {
  registry.register(id, { id, install() {}, feature })
  registered.push(id)
}
afterEach(() => { registered.splice(0).forEach((id) => registry.remove(id)) })

function render(props = {}) {
  return mount(LjPageHeader, {
    props: { title: 'Users', ...props },
    slots: { actions: '<span class="own">New</span>' },
  })
}

describe('<LjPageHeader /> plugin actions', () => {
  it('mounts the contributed `actionExtension` components after the own actions, with the context', () => {
    register('test-header-action', (action, ctx) => (action === 'actionExtension' && ctx.target === 'user' ? { action: FakeAction } : null))
    const w = render({ actionsTarget: 'user', actionsContext: () => ({ selected: [1, 2] }) })
    const bar = w.find('.ph-actions')
    expect(bar.find('.own').exists()).toBe(true)
    expect(bar.find('.fake').text()).toBe('user:2')
    // Own actions come first, contributions last
    expect(bar.element.lastElementChild.className).toContain('fake')
  })

  it('renders the actions bar for contributions alone (no own actions slot)', () => {
    register('test-header-action', () => ({ action: FakeAction }))
    const w = mount(LjPageHeader, { props: { title: 'Users', actionsTarget: 'user' } })
    expect(w.find('.ph-actions .fake').exists()).toBe(true)
  })

  it('does not poll the plugins when no target is given', () => {
    const feature = vi.fn(() => ({ action: FakeAction }))
    register('test-header-action', feature)
    const w = render()
    expect(feature).not.toHaveBeenCalled()
    expect(w.find('.fake').exists()).toBe(false)
    expect(w.find('.own').exists()).toBe(true)
  })
})
