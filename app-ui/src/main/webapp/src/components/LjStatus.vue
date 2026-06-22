<!--
  LjStatus — solo status dot + tooltip, the standard for "active / inactive"
  cells in tables. Replaces the green-light-with-text and v-chip patterns
  scattered across the application (e.g. SystemNodeView, SystemPluginView).

  Two ways to drive it:

  1. Binary (legacy) — `active` boolean, true → green/ok, false → grey/idle:

       <LjStatus :active="row.enabled" :tooltip="t('common.activated')" />
       <LjStatus :active="false" :tooltip="t('common.disabled')" />

  2. Semantic (multi-state) — `status` overrides `active` and accepts
     'ok' (green) | 'warn' (orange) | 'error' (red) | 'idle' (grey), for
     tri-state cases like the plugin lifecycle or `locked = error`:

       <LjStatus status="warn" :tooltip="t('plugin.idle')" />
       <LjStatus :status="row.locked ? 'error' : 'ok'" :tooltip="..." />

  Renders an inline circular dot with a matching glow — a 1:1 reuse of the
  plugin-id DelegateListView `.bdot` pattern (PR #56) so every table reads
  the same. The tooltip is required for a11y (it carries the meaning the
  removed text used to).

  Size is exposed as the `--lj-status-size` custom property on the element
  so a caller can override it locally if ever needed.
-->
<template>
  <span class="lj-status" :class="`lj-status--${resolved}`" role="img" :aria-label="tooltip">
    <v-tooltip activator="parent" :text="tooltip" location="top" />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Binary shortcut: true → 'ok', false → 'idle'. Ignored when `status` is set.
  active: { type: Boolean, default: false },
  // Semantic state; overrides `active` when provided.
  status: {
    type: String,
    default: null,
    validator: (v) => v === null || ['ok', 'warn', 'error', 'idle'].includes(v),
  },
  // Required: the status meaning, surfaced on hover (a11y label too).
  tooltip: { type: String, required: true },
})

// `status` wins; otherwise fall back to the binary `active` mapping.
const resolved = computed(() => props.status ?? (props.active ? 'ok' : 'idle'))
</script>

<style scoped>
.lj-status {
  --lj-status-size: 10px;
  display: inline-block;
  width: var(--lj-status-size);
  height: var(--lj-status-size);
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), .2);
  transition: background .15s, box-shadow .15s;
}
.lj-status--ok {
  background: #1d9d63;
  box-shadow: 0 0 0 3px rgba(29, 157, 99, .18), 0 0 10px 1px rgba(29, 157, 99, .6);
}
.lj-status--warn {
  background: #df8a42;
  box-shadow: 0 0 0 3px rgba(223, 138, 66, .18), 0 0 10px 1px rgba(223, 138, 66, .6);
}
.lj-status--error {
  background: #df4d42;
  box-shadow: 0 0 0 3px rgba(223, 77, 66, .18), 0 0 10px 1px rgba(223, 77, 66, .6);
}
.lj-status--idle {
  background: rgba(var(--v-theme-on-surface), .2);
}
</style>
