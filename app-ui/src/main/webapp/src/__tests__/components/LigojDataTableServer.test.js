import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LigojDataTableServer from '@/components/LigojDataTableServer.vue'

const vuetify = createVuetify({ components, directives })

const HEADERS = [
  { title: 'Id',   key: 'id' },
  { title: 'Name', key: 'name' },
  { title: '',     key: 'actions', sortable: false },
]

const PAGE_ITEMS = [{ id: 10, name: 'page-one' }]
const ALL_ITEMS  = [
  { id: 10, name: 'page-one' },
  { id: 11, name: 'page-two' },
  { id: 12, name: 'page-three' },
]

function mountServer(props = {}) {
  return mount(LigojDataTableServer, {
    props: {
      headers: HEADERS,
      items: PAGE_ITEMS,
      itemsLength: 100,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('LigojDataTableServer', () => {
  it('renders v-data-table-server with the cogs tools menu', () => {
    const wrapper = mountServer()
    // v-data-table-server extends v-table so the base class still applies.
    expect(wrapper.find('.v-table').exists()).toBe(true)
    expect(wrapper.html()).toContain('mdi-cog')
  })

  it('copyToClipboard calls fetchAll and exports ALL rows, not just the current page', async () => {
    const fetchAll = vi.fn().mockResolvedValue(ALL_ITEMS)
    const wrapper = mountServer({ fetchAll })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })

    await wrapper.vm.copyToClipboard()
    expect(fetchAll).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0][0]
    const lines = text.split('\n')
    expect(lines[0]).toBe('Id\tName')
    // header + 3 rows → 4 lines total, even though the grid only displays 1.
    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe('10\tpage-one')
    expect(lines[2]).toBe('11\tpage-two')
    expect(lines[3]).toBe('12\tpage-three')
  })

  it('falls back to exporting the current page when fetchAll is not provided', async () => {
    const wrapper = mountServer()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })
    await wrapper.vm.copyToClipboard()
    const lines = writeText.mock.calls[0][0].split('\n')
    expect(lines).toHaveLength(2) // header + single page item
  })

  it('exportCsv downloads a Blob using the fetched rows', async () => {
    const fetchAll = vi.fn().mockResolvedValue(ALL_ITEMS)
    const wrapper = mountServer({ fetchAll, filename: 'users.csv' })
    const create = vi.fn(() => 'blob:mock')
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = create
    URL.revokeObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await wrapper.vm.exportCsv()
    expect(fetchAll).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(clickSpy).toHaveBeenCalled()

    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
    clickSpy.mockRestore()
  })
})
