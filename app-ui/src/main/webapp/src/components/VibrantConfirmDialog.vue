<!--
  VibrantConfirmDialog — 2026 "Vibrant" replacement for the host's
  LigojConfirmDialog (delete / unsaved-guard / lock-isolate-reset confirms).
  Same public API (props/slots/events) so callers swap it in by aliasing the
  import — no template changes. The parent owns the lifecycle: confirm never
  auto-closes. Theme-adaptive; CSS vars live on the .vconfirm card so they
  reach the teleported dialog content.
-->
<template>
  <v-dialog :model-value="modelValue" :max-width="maxWidth" :persistent="persistent" @update:model-value="$emit('update:modelValue', $event)">
    <v-card class="vconfirm" :class="`tone-${tone}`">
      <div class="vc-head">
        <span v-if="icon" class="vc-ic"><v-icon color="#fff" size="22">{{ icon }}</v-icon></span>
        <h3>{{ title }}</h3>
      </div>
      <div class="vc-body">
        <slot>{{ message }}</slot>
      </div>
      <div class="vc-foot">
        <button class="vc-btn ghost" :disabled="loading" @click="onCancel">{{ resolvedCancelLabel }}</button>
        <button class="vc-btn confirm" :disabled="loading" @click="$emit('confirm')">
          <span v-if="loading" class="vc-spin" aria-hidden="true" />
          {{ resolvedConfirmLabel }}
        </button>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useI18nStore } from '@ligoj/host'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  cancelLabel: { type: String, default: null },
  confirmLabel: { type: String, default: null },
  confirmColor: { type: String, default: 'primary' },
  confirmVariant: { type: String, default: 'elevated' }, // accepted for API parity (unused)
  loading: { type: Boolean, default: false },
  maxWidth: { type: [Number, String], default: 440 },
  persistent: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  iconColor: { type: String, default: '' }, // accepted for API parity (tone drives colour)
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'update:skipForever'])
const { t } = useI18nStore()

const resolvedCancelLabel = computed(() => props.cancelLabel || t('common.cancel'))
const resolvedConfirmLabel = computed(() => props.confirmLabel || t('common.confirm'))
// error / warning → semantic solid; anything else → warm brand gradient.
const tone = computed(() => (props.confirmColor === 'error' || props.confirmColor === 'warning' || props.confirmColor === 'success') ? props.confirmColor : 'brand')

function onCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>

<style scoped>
.vconfirm {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --border: rgba(var(--v-theme-on-surface), .14);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  /* Shape / type from the active style's design tokens (see
   * assets/vuetify-overrides.css); fall back to the 2026 defaults. */
  --font: var(--lj-font, "Bricolage Grotesque", system-ui, sans-serif);
  --sys: var(--lj-font, -apple-system, BlinkMacSystemFont, sans-serif);
  /* tone-driven accent (the confirm button + icon tile) */
  --accent: #ff5a52;
  --accent-grad: linear-gradient(135deg, #ff9436, #ff5a52);
  border-radius: var(--lj-radius, 18px) !important;
  box-shadow: var(--lj-shadow-lg, 0 30px 80px -30px rgba(0, 0, 0, .55)) !important;
  font-family: var(--sys);
}
.vconfirm.tone-error { --accent: rgb(var(--v-theme-error)); --accent-grad: rgb(var(--v-theme-error)); }
.vconfirm.tone-warning { --accent: rgb(var(--v-theme-warning)); --accent-grad: rgb(var(--v-theme-warning)); }
.vconfirm.tone-success { --accent: rgb(var(--v-theme-success)); --accent-grad: rgb(var(--v-theme-success)); }

/* Destructive / cautionary confirmations shake on appear to flag the
   irreversible action. Neutral (brand) confirmations stay calm. The shake
   lives on the inner card, distinct from v-dialog's own scale transition on
   the overlay content, so the two don't fight. */
.vconfirm.tone-error, .vconfirm.tone-warning { animation: vc-shake .5s cubic-bezier(.36, .07, .19, .97) both; transform-origin: center; }
@keyframes vc-shake {
  0% { transform: translateX(0); }
  12%, 84% { transform: translateX(-5px); }
  24%, 72% { transform: translateX(6px); }
  36%, 60% { transform: translateX(-7px); }
  48% { transform: translateX(7px); }
  100% { transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .vconfirm.tone-error, .vconfirm.tone-warning { animation: none; }
}

.vc-head { display: flex; align-items: center; gap: 12px; padding: 20px 22px 6px; }
.vc-ic { width: 40px; height: 40px; border-radius: var(--lj-radius-sm, 11px); display: grid; place-items: center; flex: none; background: var(--accent-grad); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--accent) 65%, transparent); }
.vc-head h3 { font-family: var(--font); font-weight: var(--lj-weight-bold, 800); font-size: 18px; letter-spacing: var(--lj-tracking, -.02em); margin: 0; color: var(--ink); }

.vc-body { padding: 8px 22px 4px; font-size: 14px; line-height: 1.5; color: var(--ink-2); }
.vc-body :deep(strong) { font-weight: 800; }

.vc-foot { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 16px 22px 20px; }
.vc-btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: var(--lj-radius-sm, 11px); text-transform: var(--lj-uppercase, none); cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.vc-btn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.vc-btn.ghost:hover:not(:disabled) { background: var(--hover); border-color: var(--border-2); }
.vc-btn.confirm { color: #fff; background: var(--accent-grad); box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--accent) 60%, transparent); }
.vc-btn.confirm:hover:not(:disabled) { filter: brightness(1.05); }
.vc-btn:disabled { opacity: .6; cursor: default; }
.vc-spin { width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: vcspin .7s linear infinite; }
@keyframes vcspin { to { transform: rotate(360deg); } }
</style>
