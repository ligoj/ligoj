<!--
  LjButton — the 2026 "Vibrant" action button, factored out of ~17 views
  that each hand-rolled `.btn` / `.btn-ghost` / `.btn-danger` + spinner.

  Deliberately a plain <button> (not Vuetify v-btn): the 2026 design uses a
  flat gradient pill that doesn't map cleanly onto v-btn variants, and the
  views already render <button class="btn">. Drop-in:

    <LjButton icon="mdi-plus" @click="openCreate">{{ t('user.new') }}</LjButton>
    <LjButton variant="ghost" :loading="exporting" icon="mdi-download" @click="onExport">…</LjButton>

  Shape/colour come from the active style's `--lj-*` tokens (via the host
  vuetify-overrides token layer); when used inside a `.lj-surface` root the
  view's local `--radius-sm` / `--font` resolve, otherwise the fallbacks
  keep it rendering standalone.
-->
<template>
  <button
    class="lj-btn"
    :class="variant"
    :type="type"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="lj-btn-spin" :class="{ tinted: variant !== 'primary' && variant !== 'danger' }" aria-hidden="true" />
    <v-icon v-else-if="icon" :size="iconSize">{{ icon }}</v-icon>
    <slot />
  </button>
</template>

<script setup>
defineProps({
  // primary = gradient CTA, ghost = outlined neutral, danger = solid error.
  variant: { type: String, default: 'primary' },
  icon: { type: String, default: '' },
  iconSize: { type: [Number, String], default: 18 },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})
defineEmits(['click'])
</script>

<style scoped>
.lj-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font, "Bricolage Grotesque", system-ui, sans-serif);
  font-weight: 700;
  font-size: 14px;
  padding: 11px 17px;
  border-radius: var(--radius-sm, var(--lj-radius-sm, 8px));
  text-transform: var(--lj-uppercase, none);
  cursor: pointer;
  border: 1px solid transparent;
  transition: filter .15s, background .15s, border-color .15s, box-shadow .15s;
}
.lj-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, #ff9436, #ff5a52);
  box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55);
}
.lj-btn.primary:hover:not(:disabled) {
  filter: brightness(1.04);
  box-shadow: 0 10px 22px -10px rgba(255, 90, 82, .65);
}
.lj-btn.ghost {
  color: var(--ink-2, rgba(var(--v-theme-on-surface), .72));
  background: var(--surface, rgb(var(--v-theme-surface)));
  border-color: var(--border, rgba(var(--v-theme-on-surface), .12));
}
.lj-btn.ghost:hover:not(:disabled) {
  border-color: var(--border-2, rgba(var(--v-theme-on-surface), .26));
  background: var(--hover, rgba(var(--v-theme-on-surface), .06));
}
.lj-btn.danger {
  color: #fff;
  background: rgb(var(--v-theme-error));
}
.lj-btn.danger:hover:not(:disabled) {
  filter: brightness(1.06);
}
.lj-btn:disabled {
  opacity: .55;
  cursor: default;
}
.lj-btn-spin {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, .5);
  border-top-color: #fff;
  border-radius: 50%;
  animation: lj-btn-spin .7s linear infinite;
}
.lj-btn-spin.tinted {
  border-color: var(--border-2, rgba(var(--v-theme-on-surface), .26));
  border-top-color: var(--ink-2, rgba(var(--v-theme-on-surface), .72));
}
@keyframes lj-btn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .lj-btn-spin { animation: none; } }
</style>
