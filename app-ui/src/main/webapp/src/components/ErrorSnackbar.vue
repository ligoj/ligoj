<!--
  ErrorSnackbar — 2026 "Vibrant" global notification stack. The core `useApi`
  auto-pushes every non-2xx response onto `useErrorStore().errors` (and pages
  can call errorStore.success/info), but the standalone 2026 shell never
  rendered that queue, so API failures were silent. This subscribes to the
  store and renders a bottom-right stack of theme-adaptive toasts (severity
  icon + colour, optional expandable technical details, manual dismiss). The
  store handles auto-dismiss timeouts; we only render + allow closing.
-->
<template>
  <div class="snacks" aria-live="polite" aria-atomic="false">
    <transition-group name="snack">
      <div v-for="e in errorStore.errors" :key="e.id" class="snack" :class="e.severity" role="status">
        <span class="s-ic"><v-icon size="20">{{ icon(e.severity) }}</v-icon></span>
        <div class="s-body">
          <div v-if="e.title" class="s-title">{{ e.title }}</div>
          <div class="s-msg">{{ e.message }}</div>
          <button v-if="e.details" class="s-more" @click="toggle(e.id)">
            <v-icon size="14" :class="{ open: open.has(e.id) }">mdi-chevron-down</v-icon>{{ t('common.detailsToggle') || 'Détails' }}
          </button>
          <pre v-if="e.details && open.has(e.id)" class="s-details">{{ e.details }}</pre>
        </div>
        <button class="s-x" :title="t('common.dismiss') || 'Fermer'" @click="errorStore.dismiss(e.id)"><v-icon size="16">mdi-close</v-icon></button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useErrorStore, useI18nStore } from '@ligoj/host'

const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

const open = reactive(new Set())
function toggle(id) { open.has(id) ? open.delete(id) : open.add(id) }

const ICONS = {
  error: 'mdi-alert-circle',
  warning: 'mdi-alert',
  success: 'mdi-check-circle',
  info: 'mdi-information',
}
function icon(sev) { return ICONS[sev] || ICONS.info }
</script>

<style scoped>
.snacks {
  position: fixed; bottom: 22px; right: 22px; z-index: 70;
  display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
  max-width: min(420px, calc(100vw - 44px)); pointer-events: none;
  --font: var(--lj-font, var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif));
  --mono: var(--lj-mono, var(--v26-mono, "JetBrains Mono", ui-monospace, monospace));
  /* Shape/type from the active style's design tokens (assets/vuetify-overrides.css)
   * so this hand-rolled toast stack re-shapes with the theme, not just recolors.
   * Fallbacks keep the original look when no style attribute is set. */
  --radius: var(--lj-radius, 14px);
  --shadow-lg: var(--lj-shadow-lg, 0 18px 40px -16px rgba(0, 0, 0, .45));
  --border-w: var(--lj-border-width, 1px);
  --border-c: var(--lj-border-color, rgba(var(--v-theme-on-surface), .1));
  --bold: var(--lj-weight-bold, 800);
}
.snack {
  pointer-events: auto; position: relative; width: 100%;
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 14px 14px 16px; border-radius: var(--radius);
  background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface));
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid var(--c, rgb(var(--v-theme-on-surface)));
}
.snack.error { --c: #df4d42; }
.snack.warning { --c: #d9701a; }
.snack.success { --c: #1d9d63; }
.snack.info { --c: #2f6df6; }
.s-ic { flex: none; color: var(--c); margin-top: 1px; }
.s-body { flex: 1; min-width: 0; }
.s-title { font-family: var(--font); font-weight: var(--bold); font-size: 14px; letter-spacing: -.01em; margin-bottom: 2px; }
.s-msg { font-family: var(--font); font-size: 13.5px; font-weight: 500; line-height: 1.45; color: rgba(var(--v-theme-on-surface), .82); word-break: break-word; }
.s-more { display: inline-flex; align-items: center; gap: 4px; margin-top: 7px; border: 0; background: transparent; cursor: pointer; font-family: var(--font); font-weight: 700; font-size: 12px; color: var(--c); padding: 2px 4px; border-radius: var(--lj-radius-sm, 6px); }
.s-more .v-icon { transition: transform .2s; }
.s-more .v-icon.open { transform: rotate(180deg); }
.s-details { margin: 8px 0 0; max-height: 180px; overflow: auto; font-family: var(--mono); font-size: 11.5px; line-height: 1.5; color: rgba(var(--v-theme-on-surface), .7); background: rgba(var(--v-theme-on-surface), .05); border-radius: var(--lj-radius-sm, 9px); padding: 9px 11px; white-space: pre-wrap; word-break: break-word; }
.s-x { flex: none; width: 28px; height: 28px; border: 0; background: transparent; border-radius: var(--lj-radius-sm, 8px); cursor: pointer; display: grid; place-items: center; color: rgba(var(--v-theme-on-surface), .5); transition: background .14s, color .14s; }
.s-x:hover { background: rgba(var(--v-theme-on-surface), .08); color: rgb(var(--v-theme-on-surface)); }

/* Enter/leave + reflow transitions. */
.snack-enter-active { transition: transform .28s cubic-bezier(.2, .7, .3, 1), opacity .28s; }
.snack-leave-active { transition: transform .2s ease, opacity .2s; position: absolute; right: 0; width: 100%; }
.snack-enter-from { transform: translateX(24px); opacity: 0; }
.snack-leave-to { transform: translateX(24px); opacity: 0; }
.snack-move { transition: transform .24s cubic-bezier(.2, .7, .3, 1); }
@media (prefers-reduced-motion: reduce) {
  .snack-enter-active, .snack-leave-active, .snack-move { transition: none; }
}
</style>
