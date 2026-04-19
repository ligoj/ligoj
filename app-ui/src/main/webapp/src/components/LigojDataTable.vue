<template>
  <v-data-table
    v-bind="$attrs"
    :headers="headers"
    :items="items"
    class="ligoj-data-table"
  >
    <!-- Forward every slot the caller provides, except the one we
         overlay for the tools menu. -->
    <template
      v-for="name in forwardedSlotNames"
      :key="name"
      #[name]="slotData"
    >
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>

    <!-- Tools menu in the header of the last column. Rendered only when
         `tools` is true AND the caller did not already define its own
         `#header.<lastKey>` slot (in which case they take over). -->
    <template
      v-if="tools && lastKey && !customLastHeaderSlot"
      #[toolsSlotName]="{ column }"
    >
      <div class="d-flex align-center justify-end ga-1">
        <span v-if="column?.title">{{ column.title }}</span>
        <v-menu location="bottom end">
          <template #activator="{ props: activatorProps }">
            <v-btn
              v-bind="activatorProps"
              icon
              size="x-small"
              variant="text"
              aria-label="Table tools"
              title="Table tools"
            >
              <v-icon size="small">mdi-cog</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              prepend-icon="mdi-file-download-outline"
              title="Export as CSV"
              @click="exportCsv"
            />
            <v-list-item
              prepend-icon="mdi-content-copy"
              title="Copy to clipboard"
              @click="copyToClipboard"
            />
          </v-list>
        </v-menu>
      </div>
    </template>
  </v-data-table>
</template>

<script setup>
/**
 * LigojDataTable — thin wrapper around Vuetify's `<v-data-table>` that
 * adds a per-table "tools" menu (Export CSV, Copy to clipboard) in the
 * header of the last column.
 *
 * All other props, attributes, events, and slots are forwarded to the
 * underlying `<v-data-table>` unchanged — use it as a drop-in.
 *
 *   <LigojDataTable
 *     :headers="headers"
 *     :items="items"
 *     filename="my-data.csv"
 *   />
 *
 * The CSV export and clipboard copy operate on `headers` + `items`.
 * The column hosting the tools icon (the last one) is assumed to be a
 * render-only column (e.g. per-row action buttons) and is excluded from
 * both exports. Pass `:tools="false"` to suppress the icon entirely.
 */
import { computed, useSlots } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  headers:  { type: Array,   required: true },
  items:    { type: Array,   default: () => [] },
  tools:    { type: Boolean, default: true },
  filename: { type: String,  default: 'table.csv' },
})

const slots = useSlots()

const lastKey = computed(() => {
  const last = props.headers[props.headers.length - 1]
  return last?.key ?? last?.value ?? null
})

const toolsSlotName = computed(() => lastKey.value ? `header.${lastKey.value}` : '')

/** If the caller already provides its own header slot for the last
 *  column, defer to them so we don't silently clobber user content. */
const customLastHeaderSlot = computed(() =>
  toolsSlotName.value ? !!slots[toolsSlotName.value] : false,
)

const forwardedSlotNames = computed(() => {
  const reserved = !customLastHeaderSlot.value && props.tools && toolsSlotName.value
    ? [toolsSlotName.value]
    : []
  return Object.keys(slots).filter((n) => !reserved.includes(n))
})

/* ------------------------------ helpers ------------------------------ */

/** Resolve a (possibly nested, dot-separated) key against an item. */
function getAt(item, key) {
  if (!key) return ''
  return key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), item)
}

function stringify(v) {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function exportableHeaders() {
  // Skip the last column (tools host) and any column without a key.
  return props.headers.filter((h, i) => {
    const key = h.key ?? h.value
    if (!key) return false
    if (i === props.headers.length - 1) return false
    return true
  })
}

function csvEscape(v) {
  const s = stringify(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function buildCsv() {
  const cols = exportableHeaders()
  const lines = [cols.map((h) => csvEscape(h.title ?? h.key ?? h.value)).join(',')]
  for (const item of props.items) {
    lines.push(cols.map((h) => csvEscape(getAt(item, h.key ?? h.value))).join(','))
  }
  return lines.join('\n')
}

/** TSV is what spreadsheet apps expect from the clipboard. */
function buildTsv() {
  const cols = exportableHeaders()
  const lines = [cols.map((h) => stringify(h.title ?? h.key ?? h.value)).join('\t')]
  for (const item of props.items) {
    lines.push(
      cols.map((h) => stringify(getAt(item, h.key ?? h.value)).replace(/\t|\r|\n/g, ' ')).join('\t'),
    )
  }
  return lines.join('\n')
}

/* ------------------------------ actions ------------------------------ */

function exportCsv() {
  const csv = buildCsv()
  // Prepend a UTF-8 BOM so Excel picks up the encoding.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = props.filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function copyToClipboard() {
  const text = buildTsv()
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

defineExpose({ exportCsv, copyToClipboard, buildCsv, buildTsv })
</script>
