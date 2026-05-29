<template>
  <div class="d-flex align-center justify-end ga-1">
    <span v-if="column?.title">{{ column.title }}</span>
    <v-menu location="bottom end">
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
        <v-list-item
          prepend-icon="mdi-file-download-outline"
          title="Export as CSV"
          :disabled="loading"
          @click="$emit('export-csv')"
        />
        <v-list-item
          prepend-icon="mdi-content-copy"
          title="Copy to clipboard"
          :disabled="loading"
          @click="$emit('copy')"
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
 * LigojDataTableServer. It owns only the UI — the two menu actions emit
 * events that the parent table handles via useTableTools.
 */
defineProps({
  column: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['export-csv', 'copy'])
</script>
