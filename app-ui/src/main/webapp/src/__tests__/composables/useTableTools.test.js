import { describe, it, expect, vi, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import {
  buildCsv,
  buildTsv,
  exportableColumns,
  useTableTools,
} from '@/composables/useTableTools.js'

const HEADERS = [
  { title: 'Id',     key: 'id' },
  { title: 'Name',   key: 'name' },
  { title: 'Nested', key: 'nested.deep' },
  { title: '',       key: 'actions' },
]

const ROWS = [
  { id: 1, name: 'alpha',   nested: { deep: 'A' } },
  { id: 2, name: 'be,ta',   nested: { deep: 'B' } },
  { id: 3, name: 'ga"mma',  nested: { deep: 'C' } },
  { id: 4, name: 'd\nelta', nested: null },
]

describe('exportableColumns', () => {
  it('drops the last header and any header without a key', () => {
    const cols = exportableColumns([
      { title: 'A', key: 'a' },
      { title: 'B' }, // no key
      { title: 'C', key: 'c' },
      { title: 'D', key: 'd' }, // last → dropped
    ])
    expect(cols.map((c) => c.key)).toEqual(['a', 'c'])
  })

  it('handles an empty headers array', () => {
    expect(exportableColumns([])).toEqual([])
  })
})

describe('buildCsv / buildTsv', () => {
  it('buildCsv escapes commas, double-quotes, and newlines; skips actions', () => {
    const csv = buildCsv(ROWS, HEADERS)
    expect(csv.startsWith('Id,Name,Nested\n')).toBe(true)
    expect(csv).toContain('\n1,alpha,A\n')
    expect(csv).toContain('\n2,"be,ta",B\n')
    expect(csv).toContain('\n3,"ga""mma",C\n')
    expect(csv).toContain('\n4,"d\nelta",')
    expect(csv).not.toContain('actions')
  })

  it('buildTsv flattens inline whitespace so each row stays on one line', () => {
    const tsv = buildTsv(ROWS, HEADERS)
    const lines = tsv.split('\n')
    expect(lines).toHaveLength(5) // header + 4 rows, newlines were collapsed
    expect(lines[0]).toBe('Id\tName\tNested')
    expect(lines[4]).toBe('4\td elta\t')
  })

  it('stringifies objects via JSON when a cell holds one', () => {
    const csv = buildCsv([{ a: { x: 1 } }], [{ title: 'A', key: 'a' }, { title: '', key: 'z' }])
    expect(csv).toContain('"{""x"":1}"')
  })
})

describe('useTableTools', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exportCsv triggers a Blob download with the configured filename', async () => {
    const create = vi.fn(() => 'blob:mock')
    const revoke = vi.fn()
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const tools = useTableTools({
      headers: () => HEADERS,
      getRows: () => ROWS,
      filename: 'stuff.csv',
    })

    await tools.exportCsv()
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(clickSpy).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:mock')

    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
  })

  it('copyToClipboard uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })
    const tools = useTableTools({
      headers: ref(HEADERS),
      getRows: ref(ROWS),
      filename: 'x.csv',
    })
    await tools.copyToClipboard()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toMatch(/^Id\tName\tNested/)
  })

  it('exporting/copying reactive flags flip during an async fetch', async () => {
    let release
    const tools = useTableTools({
      headers: () => HEADERS,
      getRows: () => new Promise((resolve) => { release = () => resolve(ROWS) }),
      filename: 'x.csv',
    })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })
    const promise = tools.copyToClipboard()
    await nextTick()
    expect(tools.copying.value).toBe(true)
    release()
    await promise
    expect(tools.copying.value).toBe(false)
  })

  it('getRows returning a non-array yields an empty export', async () => {
    const tools = useTableTools({
      headers: () => HEADERS,
      getRows: () => null,
      filename: 'x.csv',
    })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText }, configurable: true,
    })
    await tools.copyToClipboard()
    expect(writeText.mock.calls[0][0]).toBe('Id\tName\tNested')
  })
})
