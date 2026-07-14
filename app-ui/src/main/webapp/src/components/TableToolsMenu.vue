<template>
  <div class="d-flex align-center justify-end ga-1">
    <span v-if="column?.title">{{ column.title }}</span>
    <v-menu v-model="open" location="bottom end" :close-on-content-click="false">
      <template #activator="{ props: activatorProps }">
        <v-btn
          v-bind="activatorProps"
          icon
          size="small"
          variant="text"
          aria-label="Table tools"
          title="Table tools"
        >
          <v-icon size="small">mdi-cog</v-icon>
        </v-btn>
      </template>
      <v-list density="compact">
        <!-- Column selector — the standard show/hide toggle for every
             LigojDataTable. Toggling keeps the menu open (each click is
             one column); export/copy close it. -->
        <template v-if="columns.length">
          <v-list-subheader>{{ columnsLabel }}</v-list-subheader>
          <v-list-item
            v-for="c in columns"
            :key="c.key"
            @click="$emit('toggle-column', c.key)"
          >
            <template #prepend>
              <v-icon size="small">
                {{ c.visible ? 'mdi-eye' : 'mdi-eye-off-outline' }}
              </v-icon>
            </template>
            <v-list-item-title>{{ c.title }}</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1" />
        </template>
        <v-list-item
          prepend-icon="mdi-file-download-outline"
          title="Export as CSV"
          :disabled="loading"
          @click="onExport"
        />
        <v-list-item
          prepend-icon="mdi-content-copy"
          title="Copy to clipboard"
          :disabled="loading"
          @click="onCopy"
        />
      </v-list>
    </v-menu>
    <v-progress-circular
      v-if="loading"
      size="14"
      width="2"
      indeterminate
      color="primary"
    />
  </div>
</template>

<script setup>
/**
 * Shared cogs-icon tools menu used by LigojDataTable and
 * LigojDataTableServer. It owns only the UI — the actions emit events
 * that the parent table handles:
 *   export-csv / copy  → useTableTools
 *   toggle-column      → useColumnSelector
 *
 * The `columns` prop drives the optional show/hide column selector; pass
 * an empty array (the default) to hide that section entirely.
 */
import { ref } from 'vue'

defineProps({
  column: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  /** [{ key, title, visible }] toggleable columns; empty hides the section. */
  columns: { type: Array, default: () => [] },
  columnsLabel: { type: String, default: 'Columns' },
})
const emit = defineEmits(['export-csv', 'copy', 'toggle-column'])

// Controlled so a column toggle keeps the menu open while export/copy
// close it (close-on-content-click is disabled for the whole menu).
const open = ref(false)

function onExport() {
  open.value = false
  emit('export-csv')
}
function onCopy() {
  open.value = false
  emit('copy')
}
</script>
