import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LigojDataTable from '@/components/LigojDataTable.vue'

const vuetify = createVuetify({ components, directives })

const HEADERS = [
  { title: 'Id',   key: 'id' },
  { title: 'Name', key: 'name' },
  { title: '',     key: 'actions', sortable: false },
]

const ITEMS = [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }]

function mountTable(props = {}) {
  return mount(LigojDataTable, {
    props: { headers: HEADERS, items: ITEMS, ...props },
    global: { plugins: [vuetify] },
  })
}

describe('LigojDataTable', () => {
  it('renders the underlying v-data-table with the cogs tools menu', () => {
    const wrapper = mountTable()
    expect(wrapper.find('.v-table').exists()).toBe(true)
    expect(wrapper.html()).toContain('mdi-cog')
  })

  it('hides the tools menu when tools=false', () => {
    const wrapper = mountTable({ tools: false })
    expect(wrapper.html()).not.toContain('mdi-cog')
  })

  it('exportCsv triggers a download through the exposed method', async () => {
    const wrapper = mountTable({ filename: 'x.csv' })
    const create = vi.fn(() => 'blob:mock')
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = create
    URL.revokeObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await wrapper.vm.exportCsv()
    expect(create).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()

    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
    clickSpy.mockRestore()
  })

  it('copyToClipboard writes TSV text via navigator.clipboard', async () => {
    const wrapper = mountTable()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })
    await wrapper.vm.copyToClipboard()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toMatch(/^Id\tName\n1\talpha/)
  })

  it('hides a column marked hidden in its persisted storage key', () => {
    localStorage.setItem('ldt-cols', JSON.stringify(['name']))
    const wrapper = mountTable({ columnsStorageKey: 'ldt-cols' })
    // `name` is neither pinned nor the last column, so it (and its cells) go.
    expect(wrapper.text()).not.toContain('alpha')
    expect(wrapper.text()).toContain('1')
    localStorage.removeItem('ldt-cols')
  })

  it('keeps every column when the selector is disabled', () => {
    localStorage.setItem('ldt-cols2', JSON.stringify(['name']))
    const wrapper = mountTable({ columnsStorageKey: 'ldt-cols2', columnSelector: false })
    expect(wrapper.text()).toContain('alpha')
    localStorage.removeItem('ldt-cols2')
  })

  it('never hides a pinned column even when persisted hidden', () => {
    localStorage.setItem('ldt-cols3', JSON.stringify(['name']))
    const wrapper = mountTable({ columnsStorageKey: 'ldt-cols3', pinnedColumns: ['name'] })
    expect(wrapper.text()).toContain('alpha')
    localStorage.removeItem('ldt-cols3')
  })

  it('emits "tool-action" when a custom tools-cog action is chosen', async () => {
    const wrapper = mountTable({
      toolActions: [{ key: 'delete-all', title: 'Delete all', icon: 'mdi-delete-sweep', color: 'error' }],
    })
    // Open the tools cog so the menu content mounts.
    await wrapper.find('button[aria-label="Table tools"]').trigger('click')
    const item = [...document.querySelectorAll('.v-list-item')]
      .find((el) => el.textContent.includes('Delete all'))
    expect(item).toBeTruthy()
    item.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('tool-action')?.[0]).toEqual(['delete-all'])
  })
})
