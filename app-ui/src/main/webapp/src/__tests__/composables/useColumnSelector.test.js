import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useColumnSelector } from '@/composables/useColumnSelector.js'

const HEADERS = [
  { title: 'Id',   key: 'id' },
  { title: 'Name', key: 'name' },
  { title: 'Size', key: 'size' },
  { title: '',     key: 'actions' },
]

describe('useColumnSelector', () => {
  beforeEach(() => localStorage.clear())

  it('shows every column by default', () => {
    const { visibleHeaders } = useColumnSelector({ headers: () => HEADERS })
    expect(visibleHeaders.value.map((h) => h.key)).toEqual(['id', 'name', 'size', 'actions'])
  })

  it('offers every column except the pinned ones and the last as toggles', () => {
    const { columnOptions } = useColumnSelector({ headers: () => HEADERS, pinned: () => ['name'] })
    // `name` pinned explicitly, `actions` pinned implicitly (last column).
    expect(columnOptions.value.map((c) => c.key)).toEqual(['id', 'size'])
    expect(columnOptions.value.every((c) => c.visible)).toBe(true)
  })

  it('toggleColumn hides then shows a column', () => {
    const { visibleHeaders, columnOptions, toggleColumn } = useColumnSelector({ headers: () => HEADERS })
    toggleColumn('size')
    expect(visibleHeaders.value.map((h) => h.key)).toEqual(['id', 'name', 'actions'])
    expect(columnOptions.value.find((c) => c.key === 'size').visible).toBe(false)
    toggleColumn('size')
    expect(visibleHeaders.value.map((h) => h.key)).toEqual(['id', 'name', 'size', 'actions'])
  })

  it('never hides a pinned or the last (tools) column', () => {
    const { visibleHeaders, toggleColumn } = useColumnSelector({ headers: () => HEADERS, pinned: () => ['name'] })
    toggleColumn('name')
    toggleColumn('actions')
    expect(visibleHeaders.value.map((h) => h.key)).toContain('name')
    expect(visibleHeaders.value.map((h) => h.key)).toContain('actions')
  })

  it('persists the hidden set to localStorage under the storage key', () => {
    const { toggleColumn } = useColumnSelector({ headers: () => HEADERS, storageKey: 'cols-x' })
    toggleColumn('size')
    expect(JSON.parse(localStorage.getItem('cols-x'))).toEqual(['size'])
  })

  it('restores the hidden set from localStorage', () => {
    localStorage.setItem('cols-y', JSON.stringify(['id']))
    const { visibleHeaders } = useColumnSelector({ headers: () => HEADERS, storageKey: 'cols-y' })
    expect(visibleHeaders.value.map((h) => h.key)).toEqual(['name', 'size', 'actions'])
  })

  it('reloads the hidden set when the storage key changes', async () => {
    localStorage.setItem('cols-a', JSON.stringify(['id']))
    localStorage.setItem('cols-b', JSON.stringify(['size']))
    const key = ref('cols-a')
    const { visibleHeaders } = useColumnSelector({ headers: () => HEADERS, storageKey: () => key.value })
    expect(visibleHeaders.value.map((h) => h.key)).toEqual(['name', 'size', 'actions'])
    key.value = 'cols-b'
    await Promise.resolve()
    expect(visibleHeaders.value.map((h) => h.key)).toEqual(['id', 'name', 'actions'])
  })
})
