<template>
  <v-data-table
    v-bind="$attrs"
    :headers="headers"
    :items="items"
    class="ligoj-data-table"
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
  </v-data-table>
</template>

<script setup>
/**
 * LigojDataTable — client-side drop-in for `<v-data-table>` with a tools
 * menu (Export CSV, Copy to clipboard) in the header of the last column.
 *
 * The cogs column is excluded from exports; pass `:tools="false"` to
 * suppress it. See LigojDataTableServer for the server-paginated variant.
 */
import { computed, useSlots } from 'vue'
import TableToolsMenu from './TableToolsMenu.vue'
import { useTableTools } from '@/composables/useTableTools.js'

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
  return props.headers
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
  headers: () => props.headers,
  getRows: () => props.items,
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
</style>
