/*
 * Shared table-tools logic.
 *
 * `useTableTools` wires up the "Export as CSV" / "Copy to clipboard"
 * actions that LigojDataTable and LigojDataTableServer both expose via
 * their `tools` menu. Callers pass three getters:
 *
 *   headers   reactive function/ref returning the headers array
 *   getRows   sync or async function returning the rows to export
 *             — for a client-side table that's typically `() => props.items`,
 *             — for a server-side table that's `() => props.fetchAll()`
 *   filename  static string, ref, or function returning the CSV download name
 *
 * The pure `buildCsv` / `buildTsv` helpers are also exported individually so
 * tests and callers can use them without instantiating the composable.
 */
import { ref } from 'vue'

/* --------- string helpers --------- */

function stringify(v) {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function getAt(item, key) {
  if (!key) return ''
  return key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), item)
}

function csvEscape(v) {
  const s = stringify(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/* --------- column filtering --------- */

/**
 * Export-able columns: skip any header without a `key` and the last header
 * in the list (assumed to host per-row actions and the tools cogs button).
 */
export function exportableColumns(headers = []) {
  return headers.filter((h, i) => {
    const key = h?.key ?? h?.value
    if (!key) return false
    if (i === headers.length - 1) return false
    return true
  })
}

/* --------- CSV / TSV builders (pure) --------- */

export function buildCsv(rows = [], headers = []) {
  const cols = exportableColumns(headers)
  const lines = [cols.map((h) => csvEscape(h.title ?? h.key ?? h.value)).join(',')]
  for (const row of rows) {
    lines.push(cols.map((h) => csvEscape(getAt(row, h.key ?? h.value))).join(','))
  }
  return lines.join('\n')
}

/** TSV is what spreadsheet apps expect on the clipboard. */
export function buildTsv(rows = [], headers = []) {
  const cols = exportableColumns(headers)
  const lines = [cols.map((h) => stringify(h.title ?? h.key ?? h.value)).join('\t')]
  for (const row of rows) {
    lines.push(
      cols
        .map((h) => stringify(getAt(row, h.key ?? h.value)).replace(/\t|\r|\n/g, ' '))
        .join('\t'),
    )
  }
  return lines.join('\n')
}

/* --------- download + clipboard side effects --------- */

function downloadCsv(csv, filename) {
  // Prepend a UTF-8 BOM so Excel picks up the encoding.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    /* fall through to the legacy textarea path */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '-1000px'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch { /* ignore */ }
  ta.remove()
}

/* --------- the composable --------- */

/**
 * @param {object} deps
 * @param {() => Array|{value: Array}} deps.headers
 * @param {() => Array|Promise<Array>} deps.getRows
 * @param {string|(() => string)} [deps.filename='table.csv']
 */
export function useTableTools({ headers, getRows, filename = 'table.csv' }) {
  const exporting = ref(false)
  const copying = ref(false)

  function resolveHeaders() {
    const h = typeof headers === 'function' ? headers() : headers?.value
    return Array.isArray(h) ? h : []
  }

  async function resolveRows() {
    const v = typeof getRows === 'function' ? await getRows() : getRows?.value
    return Array.isArray(v) ? v : []
  }

  function resolveFilename() {
    const f = typeof filename === 'function' ? filename() : filename?.value ?? filename
    return typeof f === 'string' && f.length ? f : 'table.csv'
  }

  async function exportCsv() {
    exporting.value = true
    try {
      const rows = await resolveRows()
      const csv = buildCsv(rows, resolveHeaders())
      downloadCsv(csv, resolveFilename())
    } finally {
      exporting.value = false
    }
  }

  async function copyToClipboard() {
    copying.value = true
    try {
      const rows = await resolveRows()
      const tsv = buildTsv(rows, resolveHeaders())
      await copyTextToClipboard(tsv)
    } finally {
      copying.value = false
    }
  }

  return { exporting, copying, exportCsv, copyToClipboard }
}
