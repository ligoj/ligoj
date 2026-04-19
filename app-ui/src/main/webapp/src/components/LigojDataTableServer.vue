<template>
  <v-data-table-server
    v-bind="$attrs"
    :headers="headers"
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
        @export-csv="exportCsv"
        @copy="copyToClipboard"
      />
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
})

const slots = useSlots()

const lastKey = computed(() => {
  const last = props.headers[props.headers.length - 1]
  return last?.key ?? last?.value ?? null
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

const { exporting, copying, exportCsv, copyToClipboard } = useTableTools({
  headers: () => props.headers,
  getRows: async () => (props.fetchAll ? await props.fetchAll() : props.items),
  filename: () => props.filename,
})

defineExpose({ exportCsv, copyToClipboard })
</script>
