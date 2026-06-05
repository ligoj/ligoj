<!--
  LjDialog — the 2026 modal chrome, factored out of ~16 views that each
  hand-rolled `.vmodal` / `.vmodal-head` / `.mi` / `.x` / `.vmodal-body` /
  `.vmodal-foot`.

    <LjDialog v-model="editDialog" :title="t('user.edit')" icon="mdi-account" max-width="560">
      <v-form ref="formRef" @submit.prevent="save"> … </v-form>
      <template #footer>
        <LjButton variant="ghost" @click="editDialog = false">{{ t('common.cancel') }}</LjButton>
        <LjButton icon="mdi-content-save" :loading="saving" @click="save">{{ t('common.save') }}</LjButton>
      </template>
    </LjDialog>

  The card carries `lj-surface` + its own var defaults, so the chrome AND any
  slotted content keep their tokens after `v-dialog` teleports the card to
  <body> (scoped page vars don't reach teleported content — this is the
  proven VibrantConfirmDialog pattern). The footer is right-aligned; pass
  LjButtons in any order.
-->
<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="vmodal lj-surface">
      <div class="vmodal-head">
        <span v-if="icon" class="mi"><v-icon color="#fff">{{ icon }}</v-icon></span>
        <h3>{{ title }}</h3>
        <button class="x" :aria-label="closeLabel" @click="close"><v-icon size="20">mdi-close</v-icon></button>
      </div>
      <v-card-text class="vmodal-body"><slot /></v-card-text>
      <div v-if="$slots.footer" class="vmodal-foot">
        <span class="foot-sp" />
        <slot name="footer" />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useI18nStore } from '@ligoj/host'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  maxWidth: { type: [Number, String], default: 560 },
  persistent: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18nStore()
const closeLabel = t('common.cancel')

function close() { emit('update:modelValue', false) }
</script>

<style scoped>
/* Card-level vars + chrome. `.lj-surface` (global, applied on the card)
   provides --ink/--surface/--radius/etc.; these few are the modal-specific
   bits, kept here so they teleport with the card. */
.vmodal {
  border-radius: var(--radius, var(--lj-radius, 20px)) !important;
  box-shadow: var(--shadow-lg, var(--lj-shadow-lg, 0 30px 80px -30px rgba(0, 0, 0, .55))) !important;
}
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi {
  width: 42px; height: 42px; flex: none;
  border-radius: var(--radius-sm, var(--lj-radius-sm, 12px));
  display: grid; place-items: center;
  background: linear-gradient(135deg, #ff9436, #ff5a52);
  box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6);
}
.vmodal-head h3 {
  font-family: var(--font, "Bricolage Grotesque", system-ui, sans-serif);
  font-weight: var(--bold, var(--lj-weight-bold, 800));
  font-size: 20px; margin: 0; flex: 1;
  color: var(--ink, rgb(var(--v-theme-on-surface)));
  letter-spacing: var(--lj-tracking, -.02em);
}
.vmodal-head .x {
  width: 36px; height: 36px; border: 0; background: transparent;
  border-radius: var(--radius-sm, var(--lj-radius-sm, 9px));
  cursor: pointer; display: grid; place-items: center;
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .55));
}
.vmodal-head .x:hover { background: var(--hover, rgba(var(--v-theme-on-surface), .06)); color: var(--ink, rgb(var(--v-theme-on-surface))); }
.vmodal-body { padding: 14px 24px 4px !important; }
.vmodal-body :deep(.v-field) { border-radius: var(--radius-sm, var(--lj-radius-sm, 12px)); font-family: var(--font, "Bricolage Grotesque", system-ui, sans-serif); }
.vmodal-body :deep(.v-field__prepend-inner .v-icon) { opacity: .55; }
.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 12px 24px 22px; }
.foot-sp { flex: 1; }
</style>
