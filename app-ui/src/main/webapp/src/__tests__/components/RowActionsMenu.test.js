import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import RowActionsMenu from '@/components/RowActionsMenu.vue'

const vuetify = createVuetify({ components, directives })

const ACTIONS = [
  { key: 'edit',   title: 'Edit',   icon: 'mdi-pencil' },
  { key: 'delete', title: 'Delete', icon: 'mdi-delete', color: 'error' },
]

// Unmounted after each test: an open menu teleports its list to <body> and
// would otherwise leak into the next test even when an assertion fails.
let mounted = null
function mountMenu(props = {}) {
  mounted = mount(RowActionsMenu, {
    props: { actions: ACTIONS, ...props },
    global: { plugins: [vuetify] },
  })
  return mounted
}
afterEach(() => { mounted?.unmount(); mounted = null })

describe('RowActionsMenu', () => {
  it('renders a cog activator with an accessible label', () => {
    const wrapper = mountMenu({ label: 'Row actions' })
    expect(wrapper.html()).toContain('mdi-cog')
    const btn = wrapper.find('button')
    expect(btn.attributes('aria-label')).toBe('Row actions')
    // The `.no-row-edit` marker lets a row-click handler ignore this button.
    expect(btn.classes()).toContain('no-row-edit')
  })

  it('honours a custom activator icon', () => {
    const wrapper = mountMenu({ icon: 'mdi-dots-vertical' })
    expect(wrapper.html()).toContain('mdi-dots-vertical')
  })

  it('renders an action chip (e.g. network link counts) only on the actions declaring one', async () => {
    const wrapper = mountMenu({
      actions: [
        { key: 'edit', title: 'Edit', icon: 'mdi-pencil' },
        { key: 'network', title: 'Network', icon: 'mdi-lan', chip: [{ icon: 'mdi-arrow-down', text: 2 }, { icon: 'mdi-arrow-up', text: 1 }], chipTooltip: '2 inbound, 1 outbound links' },
      ],
    })
    await wrapper.find('button').trigger('click')
    const items = [...document.querySelectorAll('.v-list-item')]
    expect(items[0].querySelector('.v-chip')).toBeNull()
    const chip = items[1].querySelector('.v-chip')
    expect(chip).not.toBeNull()
    const parts = [...chip.querySelectorAll('.ram-chip-part')]
    expect(parts.map((part) => part.textContent.trim())).toEqual(['2', '1'])
    expect(parts[0].innerHTML).toContain('mdi-arrow-down')
    expect(parts[1].innerHTML).toContain('mdi-arrow-up')
    // The chip explains itself on hover
    const tooltip = wrapper.findComponent({ name: 'VTooltip' })
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.props('text')).toBe('2 inbound, 1 outbound links')
  })

  it('emits "select" with the action key when a menu item is chosen', async () => {
    const wrapper = mountMenu()
    // Open the menu so its list content mounts, then click the first item.
    await wrapper.find('button').trigger('click')
    const items = document.querySelectorAll('.v-list-item')
    expect(items.length).toBe(ACTIONS.length)
    items[0].click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('select')?.[0]).toEqual(['edit'])
  })
})
