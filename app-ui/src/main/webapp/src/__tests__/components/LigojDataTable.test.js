import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LigojDataTable from '@/components/LigojDataTable.vue'

const vuetify = createVuetify({ components, directives })

const HEADERS = [
  { title: 'Id',     key: 'id' },
  { title: 'Name',   key: 'name' },
  { title: 'Nested', key: 'nested.deep' },
  { title: '',       key: 'actions', sortable: false },
]

const ITEMS = [
  { id: 1, name: 'alpha',   nested: { deep: 'A' }, actions: '—' },
  { id: 2, name: 'be,ta',   nested: { deep: 'B' } },
  { id: 3, name: 'ga"mma',  nested: { deep: 'C' } },
  { id: 4, name: 'd\nelta', nested: null },
]

function mountTable(props = {}) {
  return mount(LigojDataTable, {
    props: { headers: HEADERS, items: ITEMS, ...props },
    global: { plugins: [vuetify] },
  })
}

describe('LigojDataTable', () => {
  beforeEach(() => {
    // jsdom ships a textarea/execCommand stub good enough for the fallback
    // path; clipboard API is absent by default, which the component handles.
  })

  it('renders and exposes the underlying v-data-table headers + items', () => {
    const wrapper = mountTable()
    // Vuetify renders the Vue component tree; the wrapper root should exist.
    expect(wrapper.find('.v-table').exists()).toBe(true)
  })

  it('buildCsv() skips the last (tools-host) column and escapes quotes, commas, newlines', () => {
    const wrapper = mountTable()
    const csv = wrapper.vm.buildCsv()
    // Header row + data rows joined by \n (rows with an embedded newline
    // stay inside quoted fields so a naive split('\n') wouldn't line up).
    expect(csv.startsWith('Id,Name,Nested\n')).toBe(true)
    expect(csv).toContain('\n1,alpha,A\n')
    expect(csv).toContain('\n2,"be,ta",B\n')
    expect(csv).toContain('\n3,"ga""mma",C\n')
    expect(csv).toContain('\n4,"d\nelta",')
    expect(csv).not.toContain('actions')
  })

  it('buildTsv() uses tab separators and flattens whitespace inside cells', () => {
    const wrapper = mountTable()
    const tsv = wrapper.vm.buildTsv()
    const lines = tsv.split('\n')
    expect(lines[0]).toBe('Id\tName\tNested')
    expect(lines[1]).toBe('1\talpha\tA')
    // The newline in "d\nelta" becomes a space in TSV so the row stays one line.
    expect(lines[4]).toBe('4\td elta\t')
  })

  it('exportCsv() triggers a download via a Blob link', () => {
    const wrapper = mountTable({ filename: 'sample.csv' })
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    // Stub anchor click so jsdom doesn't try to navigate.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    wrapper.vm.exportCsv()

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toMatch(/text\/csv/)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

    clickSpy.mockRestore()
    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
  })

  it('copyToClipboard() uses navigator.clipboard when available', async () => {
    const wrapper = mountTable()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const original = globalThis.navigator.clipboard
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })
    await wrapper.vm.copyToClipboard()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toMatch(/^Id\tName\tNested/)
    if (original) {
      Object.defineProperty(globalThis.navigator, 'clipboard', { value: original, configurable: true })
    } else {
      delete globalThis.navigator.clipboard
    }
  })

  it('tools=false does not expose build* / export* methods behind a menu', () => {
    const wrapper = mountTable({ tools: false })
    // The exposed API stays available (useful for programmatic access),
    // but the cogs icon and menu should not be present in the DOM.
    expect(wrapper.html()).not.toContain('mdi-cog')
  })
})
