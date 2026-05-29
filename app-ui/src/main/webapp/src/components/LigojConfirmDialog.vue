<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <slot>{{ message }}</slot>
      </v-card-text>
      <v-card-text v-if="showSkipForeverCheckbox" class="pt-0">
        <v-checkbox
          :model-value="skipForever"
          @update:model-value="$emit('update:skipForever', $event)"
          :label="t('common.dontAskAgain')"
          hide-details
          density="compact"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="onCancel">
          {{ resolvedCancelLabel }}
        </v-btn>
        <v-btn
          :color="confirmColor"
          :variant="confirmVariant"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ resolvedConfirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
/**
 * LigojConfirmDialog — the small Cancel/Confirm modal that every
 * edit screen reaches for (delete confirmation, unsaved-changes
 * guard, lock/isolate/reset action confirmations…). The default slot
 * accepts rich content so callers can mix bold or coloured spans
 * around the dynamic name; the `message` prop is a shortcut for plain
 * text.
 *
 * Usage:
 *   <LigojConfirmDialog
 *     v-model="confirmDelete"
 *     :title="t('group.deleteTitle')"
 *     :confirm-label="t('common.delete')"
 *     confirm-color="error"
 *     :loading="deleting"
 *     @confirm="remove"
 *   >
 *     {{ t('group.deleteConfirmBefore') }}
 *     <strong class="text-error">{{ name }}</strong>{{ t('group.deleteConfirmAfter') }}
 *   </LigojConfirmDialog>
 *
 * The component never auto-closes on `confirm` — the parent owns the
 * lifecycle so it can close after an async operation finishes. Cancel
 * closes by emitting `update:modelValue=false`, then fires `@cancel`
 * for callers (like the form-guard) that need a side effect too.
 */
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  /** Plain-text body — superseded by the default slot if provided. */
  message: { type: String, default: '' },
  /** Override the default "Cancel" / "Confirm" labels. */
  cancelLabel: { type: String, default: null },
  confirmLabel: { type: String, default: null },
  /** Vuetify color / variant for the confirm button. */
  confirmColor: { type: String, default: 'primary' },
  confirmVariant: { type: String, default: 'elevated' },
  /** Shows a spinner on the confirm button and disables Cancel
   *  while the parent's async action is in flight. */
  loading: { type: Boolean, default: false },
  maxWidth: { type: [Number, String], default: 400 },
  persistent: { type: Boolean, default: false },
  /** Optionally render a "don't ask again" checkbox above the actions. */
  showSkipForeverCheckbox: { type: Boolean, default: false },
  skipForever: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'update:skipForever'])
const { t } = useI18nStore()

const resolvedCancelLabel = computed(() => props.cancelLabel || t('common.cancel'))
const resolvedConfirmLabel = computed(() => props.confirmLabel || t('common.confirm'))

function onCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>
