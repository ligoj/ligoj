<template>
  <v-data-table-server
    v-bind="$attrs"
    :headers="normalizedHeaders"
    :items="items"
    :items-length="itemsLength"
    :loading="loading"
    class="ligoj-data-table-server"
  >
    <template
      v-for="name in forwardedSlotNames"
      :key="name"
      #[name]="slotData"
    >
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>

    <template
      v-if="tools && lastKey && !customLastHeaderSlot"
      #[toolsSlotName]="{ column }"
    >
      <TableToolsMenu
        :column="column"
        :loading="exporting || copying"
        :columns="columnSelector ? columnOptions : []"
        :columns-label="columnsLabel"
        @export-csv="exportCsv"
        @copy="copyToClipboard"
        @toggle-column="toggleColumn"
      />
    </template>

    <template
      v-for="h in tooltipHeaders"
      :key="h.slotName"
      #[h.slotName]="{ column, getSortIcon, toggleSort }"
    >
      <span
        class="ligoj-th-tooltip"
        :class="{ 'ligoj-th-sortable': column.sortable }"
        @click="column.sortable && toggleSort?.(column)"
      >
        {{ column.title }}
        <v-icon
          v-if="column.sortable && getSortIcon"
          :icon="getSortIcon(column)"
          size="x-small"
          class="ml-1"
        />
        <v-tooltip activator="parent" location="top" :text="h.tooltip" />
      </span>
    </template>
  </v-data-table-server>
</template>

<script setup>
/**
 * LigojDataTableServer — drop-in for `<v-data-table-server>` with the
 * same tools menu as LigojDataTable.
 *
 * Because server-side pagination only ever hands us the current page in
 * `items`, the table accepts an explicit `fetchAll` function used
 * exclusively by the Export CSV / Copy to clipboard actions. The
 * function should return the full dataset as an array — typically by
 * hitting the same endpoint without pagination (rows=99999 or whatever
 * the backend permits).
 *
 *   <LigojDataTableServer
 *     :headers="headers"
 *     :items="page.items"
 *     :items-length="page.total"
 *     :fetch-all="fetchAllRows"
 *     filename="users.csv"
 *     @update:options="onOptions"
 *   />
 */
import { computed, useSlots } from 'vue'
import TableToolsMenu from './TableToolsMenu.vue'
import { useTableTools } from '@/composables/useTableTools.js'
import { useColumnSelector } from '@/composables/useColumnSelector.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  headers:     { type: Array,   required: true },
  items:       { type: Array,   default: () => [] },
  itemsLength: { type: Number,  default: 0 },
  loading:     { type: Boolean, default: false },
  tools:       { type: Boolean, default: true },
  filename:    { type: String,  default: 'table.csv' },
  /**
   * Return the FULL dataset the menu should export. Called only when the
   * user triggers Export CSV or Copy to clipboard. If omitted the actions
   * fall back to exporting just the visible page.
   */
  fetchAll:    { type: Function, default: null },
  /** Show the standard show/hide column selector in the tools cog. */
  columnSelector:    { type: Boolean, default: true },
  columnsLabel:      { type: String,  default: 'Columns' },
  /** localStorage key — when set, hidden columns persist across reloads. */
  columnsStorageKey: { type: String,  default: null },
  /** Column keys the user can never hide (the last column is always pinned). */
  pinnedColumns:     { type: Array,   default: () => [] },
})

const slots = useSlots()

const { visibleHeaders, columnOptions, toggleColumn } = useColumnSelector({
  headers: () => props.headers,
  storageKey: () => props.columnsStorageKey,
  pinned: () => props.pinnedColumns,
})

const baseHeaders = computed(() => (props.columnSelector ? visibleHeaders.value : props.headers))

const lastKey = computed(() => {
  const last = baseHeaders.value[baseHeaders.value.length - 1]
  return last?.key ?? last?.value ?? null
})

/**
 * Force `align: 'end'` on the last column so body cells align with the
 * TableToolsMenu cog placed in this column's header (issue #41). The
 * consumer's own `align` on the last column is intentionally overridden
 * — the goal is layout consistency across every DataTable in the app.
 */
const normalizedHeaders = computed(() => {
  const src = baseHeaders.value
  if (!src.length) return src
  const list = [...src]
  const lastIdx = list.length - 1
  list[lastIdx] = { ...list[lastIdx], align: 'end' }
  return list
})

const toolsSlotName = computed(() => (lastKey.value ? `header.${lastKey.value}` : ''))

const customLastHeaderSlot = computed(() =>
  toolsSlotName.value ? !!slots[toolsSlotName.value] : false,
)

const forwardedSlotNames = computed(() => {
  const reserved = !customLastHeaderSlot.value && props.tools && toolsSlotName.value
    ? [toolsSlotName.value]
    : []
  return Object.keys(slots).filter((n) => !reserved.includes(n))
})

/**
 * Headers that opt into a Vuetify tooltip via a `tooltip` field. We
 * skip the column owned by the tools menu and any column the caller
 * already overrides with its own `header.<key>` slot.
 */
const tooltipHeaders = computed(() => {
  const reservedKey = !customLastHeaderSlot.value && props.tools ? lastKey.value : null
  return baseHeaders.value
    .filter((h) => {
      if (!h.tooltip) return false
      const k = h.key ?? h.value
      if (k === reservedKey) return false
      if (slots[`header.${k}`]) return false
      return true
    })
    .map((h) => ({ tooltip: h.tooltip, slotName: `header.${h.key ?? h.value}` }))
})

const { exporting, copying, exportCsv, copyToClipboard } = useTableTools({
  headers: () => baseHeaders.value,
  getRows: async () => (props.fetchAll ? await props.fetchAll() : props.items),
  filename: () => props.filename,
})

defineExpose({ exportCsv, copyToClipboard })
</script>

<style scoped>
.ligoj-th-tooltip {
  display: inline-flex;
  align-items: center;
}
.ligoj-th-sortable {
  cursor: pointer;
  user-select: none;
}
/* Issue #41 safety net: Vuetify 4 doesn't always propagate header.align
 * to slot content rendered inside cells, so we explicitly right-align
 * the last column body cells to match the header tools menu. */
.ligoj-data-table-server :deep(tr td:last-child) {
  text-align: end;
}
/* Vuetify 4 only styles the header for align=*, not the body cells.
   Propagate alignment to body cells so columns visually match their header. */
:deep(tbody > tr > td.v-data-table-column--align-end) {
  text-align: end;
}
:deep(tbody > tr > td.v-data-table-column--align-center) {
  text-align: center;
}
:deep(tbody > tr > td.v-data-table-column--align-start) {
  text-align: start;
}
</style>
