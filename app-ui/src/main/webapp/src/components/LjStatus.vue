<!--
  LjStatus — solo status dot + tooltip, the standard for "active / inactive"
  cells in tables. Replaces the green-light-with-text and v-chip patterns
  scattered across the application (e.g. SystemNodeView, SystemPluginView).

    <LjStatus :active="row.enabled" :tooltip="t('common.activated')" />
    <LjStatus :active="false" :tooltip="t('common.disabled')" />

  Renders an inline circular dot: vivid green with a glow when `active`,
  muted grey otherwise — a 1:1 reuse of the plugin-id DelegateListView
  `.bdot` pattern (PR #56) so every table reads the same. The tooltip is
  required for a11y (it carries the meaning the removed text used to).

  Colours/size are exposed as `--lj-status-*` custom properties on the
  element so a caller can override them locally if ever needed.
-->
<template>
  <span class="lj-status" :class="{ on: active }" role="img" :aria-label="tooltip">
    <v-tooltip activator="parent" :text="tooltip" location="top" />
  </span>
</template>

<script setup>
defineProps({
  // true → vivid green + glow, false → muted grey.
  active: { type: Boolean, default: false },
  // Required: the status meaning, surfaced on hover (a11y label too).
  tooltip: { type: String, required: true },
})
</script>

<style scoped>
.lj-status {
  --lj-status-size: 10px;
  --lj-status-on: #1d9d63;
  --lj-status-off: rgba(var(--v-theme-on-surface), .2);
  --lj-status-glow: 0 0 0 3px rgba(29, 157, 99, .18), 0 0 10px 1px rgba(29, 157, 99, .6);
  display: inline-block;
  width: var(--lj-status-size);
  height: var(--lj-status-size);
  border-radius: 50%;
  background: var(--lj-status-off);
  transition: background .15s, box-shadow .15s;
}
.lj-status.on {
  background: var(--lj-status-on);
  box-shadow: var(--lj-status-glow);
}
</style>
