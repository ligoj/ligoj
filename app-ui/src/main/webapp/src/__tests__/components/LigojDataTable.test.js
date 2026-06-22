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
})
