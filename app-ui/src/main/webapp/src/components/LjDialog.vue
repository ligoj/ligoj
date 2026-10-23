<!--
  LjDialog — the modal chrome, factored out of ~16 views that each
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
  proven LjConfirmDialog pattern). The footer is right-aligned; pass
  LjButtons in any order.

  An edit dialog passes its form as `guard`, and its Cancel button calls the
  `close` of the footer, or of the content for a panel holding its own Cancel:

    <LjDialog v-model="editDialog" :guard="editForm" …>
      <template #footer="{ close }">
        <LjButton variant="ghost" @click="close">{{ t('common.cancel') }}</LjButton>

  A close request (Cancel, the close button, Esc, the scrim) of a changed form
  then asks to discard the changes, and so does leaving the page while the
  dialog is open, unless the profile skips this confirmation. The unchanged
  form is the one shown at each opening; a form loaded after its opening
  passes `guard-ready` false while loading. Closing the dialog from the parent,
  as after a save, never asks.
-->
<template>
  <v-dialog
    v-bind="$attrs"
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    scrollable
    @update:model-value="onDialogModel"
  >
    <v-card class="vmodal lj-surface">
      <div class="vmodal-head">
        <span v-if="icon" class="mi"><v-icon color="#fff">{{ icon }}</v-icon></span>
        <h3>{{ title }}<code v-if="badge" class="badge">{{ badge }}</code></h3>
        <button class="x" :aria-label="closeLabel" @click="close"><v-icon size="20">mdi-close</v-icon></button>
      </div>
      <v-card-text class="vmodal-body"><slot :close="close" /></v-card-text>
      <div v-if="$slots.footer" class="vmodal-foot">
        <span class="foot-sp" />
        <slot name="footer" :close="close" />
      </div>
    </v-card>
  </v-dialog>
  <!-- Persistent: only its buttons dismiss it, so a pending close is always resolved -->
  <LjConfirmDialog v-if="formGuard" :model-value="formGuard.showGuardDialog.value" :title="t('common.unsavedTitle')"
    icon="mdi-content-save-alert" :message="t('common.unsavedMsg')" :confirm-label="t('common.discard')"
    confirm-color="warning" persistent @confirm="onGuardConfirm" @cancel="onGuardCancel" />
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18nStore, useFormGuard, LjConfirmDialog } from '@ligoj/host'

// The attributes go to the dialog, not to the guard confirmation beside it
defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  // Identifier of the edited entity, highlighted after the title (login, visual id, key, name).
  badge: { type: String, default: '' },
  icon: { type: String, default: '' },
  maxWidth: { type: [Number, String], default: 560 },
  persistent: { type: Boolean, default: false },
  // The edited form, to ask before discarding its changes. Unset, the dialog closes at once.
  guard: { type: null, default: undefined },
  // False while the form loads after the opening: its unchanged state is taken once ready
  guardReady: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18nStore()
const closeLabel = t('common.cancel')

// Only a guarded dialog holds a navigation: the guard watches the form and the route leave
const formGuard = props.guard === undefined ? null : useFormGuard(computed(() => props.guard))
// The confirmation was raised by a close request, not by a route leave
const pendingClose = ref(false)

/** Close request of the user: Cancel through the footer `close`, the close button, Esc or the scrim. */
function close() {
  if (formGuard?.isDirty.value && !formGuard.isConfirmationSkipped()) {
    pendingClose.value = true
    formGuard.showGuardDialog.value = true
  } else {
    emit('update:modelValue', false)
  }
}

// Without an activator, the dialog only requests its closing
function onDialogModel(value) {
  if (!value) close()
}

function onGuardConfirm() {
  if (pendingClose.value) {
    pendingClose.value = false
    formGuard.showGuardDialog.value = false
    formGuard.markClean()
    emit('update:modelValue', false)
  } else {
    formGuard.confirmLeave()
  }
}

function onGuardCancel() {
  if (pendingClose.value) {
    pendingClose.value = false
    formGuard.showGuardDialog.value = false
  } else {
    formGuard.cancelLeave()
  }
}

// The unchanged form is the one shown once the dialog is open and its form ready, after its content is mounted:
// a field normalizing its value on mount is no change. A closed dialog has no change to hold a navigation with.
watch(() => props.modelValue && props.guardReady, async (ready) => {
  if (!formGuard) return
  if (ready) await nextTick()
  formGuard.markClean()
}, { immediate: true })
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
.vmodal-head h3 .badge {
  margin-left: 10px;
  padding: 2px 8px;
  vertical-align: middle;
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ink, rgb(var(--v-theme-on-surface)));
  background: var(--pill, rgba(var(--v-theme-on-surface), .06));
  border: var(--border-w, var(--lj-border-width, 1px)) var(--lj-border-style, solid) var(--border-c, var(--border, rgba(var(--v-theme-on-surface), .12)));
  border-radius: var(--radius-sm, var(--lj-radius-sm, 8px));
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
