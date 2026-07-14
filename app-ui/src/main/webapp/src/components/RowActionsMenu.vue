<template>
  <v-menu location="bottom end">
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        icon
        size="small"
        variant="text"
        class="no-row-edit"
        :aria-label="label"
        :title="label"
        @click.stop
      >
        <v-icon size="small">{{ icon }}</v-icon>
      </v-btn>
    </template>
    <v-list density="compact" min-width="160">
      <v-list-item
        v-for="a in actions"
        :key="a.key"
        :disabled="a.disabled"
        :base-color="a.color"
        @click="$emit('select', a.key)"
      >
        <template #prepend>
          <v-icon size="small" :color="a.color">{{ a.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ a.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
/**
 * RowActionsMenu — the standard per-row actions cog for Ligoj tables.
 *
 * Groups every row action (edit / duplicate / delete / …) behind a single
 * cog, mirroring the header TableToolsMenu so a table reads as one system.
 * Pass an `actions` array and handle `select` with the chosen action key:
 *
 *   <RowActionsMenu
 *     :actions="[
 *       { key: 'edit',   title: t('common.edit'),   icon: 'mdi-pencil' },
 *       { key: 'delete', title: t('common.delete'), icon: 'mdi-delete', color: 'error' },
 *     ]"
 *     @select="onRowAction(item, $event)"
 *   />
 *
 * The activator carries `.no-row-edit` + `@click.stop` so a table wired
 * with `@click:row` (row-click-to-edit) does not fire when the cog is used.
 */
defineProps({
  /** [{ key, title, icon, color?, disabled? }] */
  actions: { type: Array, default: () => [] },
  icon:    { type: String, default: 'mdi-cog' },
  label:   { type: String, default: 'Actions' },
})
defineEmits(['select'])
</script>
