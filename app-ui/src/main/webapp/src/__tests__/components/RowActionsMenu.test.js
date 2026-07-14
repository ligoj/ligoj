import { describe, it, expect } from 'vitest'
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

function mountMenu(props = {}) {
  return mount(RowActionsMenu, {
    props: { actions: ACTIONS, ...props },
    global: { plugins: [vuetify] },
  })
}

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
