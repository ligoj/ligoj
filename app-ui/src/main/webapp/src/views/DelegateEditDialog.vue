<template>
  <div>
    <!-- Delegate create/edit popup (chantier D3). Replaces the former
         routed DelegateEditView page; hosted by DelegateListView, opened
         from the "New" button and the row pencil. model-value is bound
         one-way so a close request (Cancel / Esc / scrim) can be vetoed
         by the unsaved-changes guard before it actually closes — same
         pattern as UserEditDialog. -->
    <v-dialog :model-value="modelValue" @update:model-value="onDialogModel" max-width="640" scrollable>
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">{{ TYPE_ICONS.DELEGATE }}</v-icon></span>
          <h3>{{ isEdit ? t('delegate.edit') : t('delegate.new') }}</h3>
          <button class="x" :aria-label="t('common.cancel')" @click="requestClose"><v-icon size="20">mdi-close</v-icon></button>
        </div>

        <v-card-text class="vmodal-body">
          <v-skeleton-loader v-if="loading" type="article" />

          <v-form v-else ref="formRef" @submit.prevent="save">
            <!-- Receiver: pick the kind first (drives the autocomplete
                 endpoint for the identifier), then the identifier itself.
                 Rendered side-by-side on >= sm to keep the dependency
                 visible. -->
            <v-row density="comfortable">
              <v-col cols="12" sm="5">
                <v-select v-model="form.receiverType" :label="t('delegate.receiverType')" :items="RECEIVER_TYPES" :item-title="typeTitle" item-value="value" :prepend-inner-icon="receiverIcon"
                  :rules="[rules.required]" variant="outlined" class="mb-2">
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <v-icon :icon="TYPE_ICONS[item?.value] || ''" />
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" sm="7">
                <v-autocomplete v-model="form.receiver" v-model:search="receiverSearch" prepend-inner-icon="mdi-account-arrow-right-outline" :label="t('delegate.receiver')" :items="receiverDisplayItems" item-title="label" item-value="id"
                  :loading="receiverLoading" :rules="[rules.required]" no-filter clearable auto-select-first variant="outlined" class="mb-2" autocomplete="off" @update:search="onReceiverSearch"
                  @update:menu="onReceiverMenu" />
              </v-col>
            </v-row>

            <!-- Resource: same pattern — the type drives the
                 autocomplete endpoint (USER id, GROUP / TREE / COMPANY
                 name). -->
            <v-row density="comfortable">
              <v-col cols="12" sm="5">
                <v-select v-model="form.type" :label="t('delegate.type')" :items="RESOURCE_TYPES" :item-title="typeTitle" item-value="value" :prepend-inner-icon="typeIcon" :rules="[rules.required]"
                  variant="outlined" class="mb-2">
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <v-icon :icon="TYPE_ICONS[item?.value] || ''" />
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" sm="7">
                <!-- TREE-typed delegates point at an arbitrary LDAP DN
                     (e.g. ou=project,dc=acme,dc=com) — there's no entity
                     list to pick from, so swap the autocomplete out for a
                     free-form text field. -->
                <v-text-field v-if="form.type === 'TREE'" v-model="form.name" prepend-inner-icon="mdi-file-tree-outline" :label="t('delegate.resource')" :rules="[rules.required]" :hint="t('delegate.resourceDnHint')" persistent-hint
                  variant="outlined" class="mb-2" />
                <v-autocomplete v-else v-model="form.name" v-model:search="resourceSearch" prepend-inner-icon="mdi-shield-key-outline" :label="t('delegate.resource')" :items="resourceDisplayItems" item-title="label" item-value="id"
                  :loading="resourceLoading" :rules="[rules.required]" :hint="t('delegate.resourceHint')" persistent-hint no-filter clearable auto-select-first variant="outlined" class="mb-2" autocomplete="off"
                  @update:search="onResourceSearch" @update:menu="onResourceMenu" />
              </v-col>
            </v-row>

            <!-- Admin/Write checkboxes with inline help (chantier D7):
                 a small mdi-help-circle-outline icon hosts a v-tooltip
                 (activator="parent") so hovering the icon surfaces the
                 long-form explanation. The label text stays clickable
                 to toggle the checkbox — only the icon triggers the
                 tooltip. -->
            <v-checkbox v-model="form.canAdmin" hide-details class="mb-2">
              <template #label>
                <span class="me-1">{{ t('delegate.admin') }}</span>
                <v-icon size="x-small" color="grey">mdi-help-circle-outline</v-icon>
                <v-tooltip activator="parent" :text="t('delegate.adminHelp')" location="top" max-width="320" />
              </template>
            </v-checkbox>
            <v-checkbox v-model="form.canWrite" hide-details class="mb-2">
              <template #label>
                <span class="me-1">{{ t('delegate.write') }}</span>
                <v-icon size="x-small" color="grey">mdi-help-circle-outline</v-icon>
                <v-tooltip activator="parent" :text="t('delegate.writeHelp')" location="top" max-width="320" />
              </template>
            </v-checkbox>
          </v-form>
        </v-card-text>

        <div class="vmodal-foot">
          <button v-if="isEdit" class="mbtn ghost-danger" :disabled="loading" @click="confirmDelete = true">
            <v-icon size="18">mdi-delete</v-icon>{{ t('common.delete') }}
          </button>
          <span class="foot-sp" />
          <button class="mbtn ghost" @click="requestClose">{{ t('common.cancel') }}</button>
          <button class="mbtn primary" :disabled="loading || saving" @click="save">
            <span v-if="saving" class="mspin" aria-hidden="true" /><v-icon v-else size="18">mdi-content-save</v-icon>{{ t('common.save') }}
          </button>
        </div>
      </v-card>
    </v-dialog>

    <!-- Receiver name rendered in bold red via the LigojConfirmDialog
         default slot, mirroring the User/Group/Company/GroupMembers
         confirmation pattern. The host's monolithic
         `delegate.deleteConfirm` key stays intact for any other
         consumer; we just use two plugin-local fragments around the
         name. -->
    <LigojConfirmDialog v-model="confirmDelete" :title="t('delegate.deleteTitle')" :icon="TYPE_ICONS.DELEGATE" :confirm-label="t('common.delete')"
      confirm-color="error" :loading="deleting" @confirm="remove">
      {{ t('delegate.deleteConfirmBefore') }}<strong class="text-error">{{ form.receiver }}</strong>{{ t('delegate.deleteConfirmAfter') }}
    </LigojConfirmDialog>

    <!-- Unsaved-changes guard. Triggered either by a dialog close request
         (Cancel / Esc / scrim) or by useFormGuard's onBeforeRouteLeave
         when navigating away from the list with the dialog still open.
         persistent: only the explicit buttons dismiss it, so pendingClose
         is always reset through onGuardConfirm/onGuardCancel. -->
    <LigojConfirmDialog v-model="showGuardDialog" :title="t('common.unsavedTitle')" icon="mdi-content-save-alert" icon-color="warning" :message="t('common.unsavedMsg')" :confirm-label="t('common.discard')" confirm-color="warning"
      persistent @confirm="onGuardConfirm" @cancel="onGuardCancel" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useApi, useFormGuard, useI18nStore } from '@ligoj/host'
import { TYPE_ICONS, RECEIVER_TYPES, RESOURCE_TYPES } from '../composables/delegateTypes.js'
import LigojConfirmDialog from '../components/VibrantConfirmDialog.vue'

const props = defineProps({
  // Dialog visibility (v-model).
  modelValue: { type: Boolean, default: false },
  // Delegate id to edit; null/absent means create mode. Accepts Number or
  // String because the list passes item.id directly (the dt items
  // sometimes carry numeric ids, sometimes string ones depending on the
  // backend serializer).
  delegateId: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const api = useApi()
const i18n = useI18nStore()
const t = i18n.t

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)

const isEdit = computed(() => props.delegateId !== null && props.delegateId !== undefined && props.delegateId !== '')

/** v-select item-title callback: resolves the i18n key from the item object. */
function typeTitle(item) {
  return t(item.titleKey)
}

const form = ref({
  receiver: '',
  receiverType: 'USER',
  name: '',
  type: 'GROUP',
  canAdmin: false,
  canWrite: false,
})

// Icon shown inside the field, driven by the currently selected value.
const receiverIcon = computed(() => TYPE_ICONS[form.value.receiverType] || '')
const typeIcon = computed(() => TYPE_ICONS[form.value.type] || '')

/* -------------------------------------------------------------------------
 *  Autocomplete: receiver / resource
 *
 *  The two text inputs in section "receiver" and "resource" are dynamic
 *  v-autocompletes that hit the matching identity endpoint:
 *    receiverType=USER     → rest/service/id/user
 *    receiverType=GROUP    → rest/service/id/group
 *    receiverType=COMPANY  → rest/service/id/company
 *    type=USER/GROUP/COMPANY → same as above
 *    type=TREE             → groups (TREE delegates scope on a group)
 *
 *  Server-side filtering only (the autocomplete passes `?q=`), so we
 *  set `no-filter` on the components to disable Vuetify's local filter.
 *  ------------------------------------------------------------------- */

// TREE is intentionally absent — TREE-typed delegates use a free-form
// DN (rendered via v-text-field), so no list endpoint applies.
const TYPE_TO_ENDPOINT = {
  USER: 'service/id/user',
  GROUP: 'service/id/group',
  COMPANY: 'service/id/company',
}

/** Normalize a backend row to `{ id, label }` regardless of the entity
 *  kind. Users get `id — First Last` so the dropdown is scannable;
 *  groups/companies are identified by name only. */
function normalizeEntity(row, kind) {
  if (!row) return null
  if (kind === 'USER') {
    const full = [row.firstName, row.lastName].filter(Boolean).join(' ')
    return { id: row.id, label: full ? `${row.id} — ${full}` : row.id }
  }
  return { id: row.name, label: row.name }
}

/** Fetch the first page (rows=20) for the kind. An empty query is
 *  allowed so the dropdown can be populated before the user types —
 *  see `loadReceiverItems` / `loadResourceItems`. */
async function fetchEntities(kind, query) {
  const endpoint = TYPE_TO_ENDPOINT[kind]
  if (!endpoint) return []
  const q = (query || '').trim()
  const qp = q ? `q=${encodeURIComponent(q)}&` : ''
  const data = await api.get(`rest/${endpoint}?${qp}rows=20`)
  const rows = Array.isArray(data) ? data : (data?.data || [])
  return rows.map((r) => normalizeEntity(r, kind)).filter(Boolean)
}

const receiverItems = ref([])
const receiverSearch = ref('')
const receiverLoading = ref(false)
let receiverTimer = null

const resourceItems = ref([])
const resourceSearch = ref('')
const resourceLoading = ref(false)
let resourceTimer = null

/** Keep the currently-selected value visible in the dropdown even
 *  before the user has typed anything (e.g. on edit-mode initial
 *  load): pre-pend a synthetic item with `id = current value`. */
const receiverDisplayItems = computed(() => {
  const cur = form.value.receiver
  const items = receiverItems.value
  if (cur && !items.find((i) => i.id === cur)) {
    return [{ id: cur, label: cur }, ...items]
  }
  return items
})
const resourceDisplayItems = computed(() => {
  const cur = form.value.name
  const items = resourceItems.value
  if (cur && !items.find((i) => i.id === cur)) {
    return [{ id: cur, label: cur }, ...items]
  }
  return items
})

async function loadReceiverItems() {
  receiverLoading.value = true
  try { receiverItems.value = await fetchEntities(form.value.receiverType, receiverSearch.value) }
  finally { receiverLoading.value = false }
}
async function loadResourceItems() {
  resourceLoading.value = true
  try { resourceItems.value = await fetchEntities(form.value.type, resourceSearch.value) }
  finally { resourceLoading.value = false }
}

function onReceiverSearch(q) {
  // Vuetify mirrors the picked item's title into the search input;
  // that fires `update:search` with a label that matches an existing
  // item. Skip the round-trip in that case — otherwise we'd refetch
  // with the label and lose the row the user just picked from.
  if (receiverDisplayItems.value.some((i) => i.label === q)) return
  clearTimeout(receiverTimer)
  receiverTimer = setTimeout(loadReceiverItems, 250)
}

function onResourceSearch(q) {
  if (resourceDisplayItems.value.some((i) => i.label === q)) return
  clearTimeout(resourceTimer)
  resourceTimer = setTimeout(loadResourceItems, 250)
}

// Selecting a new type invalidates the corresponding identifier and
// drops the cached items. We deliberately don't refetch here — the
// next dropdown-open (or first keystroke) will lazy-load the first
// page for the new kind. This keeps the form quiet when the user
// doesn't actually interact with these selects.
watch(() => form.value.receiverType, () => {
  form.value.receiver = ''
  receiverSearch.value = ''
  receiverItems.value = []
})
watch(() => form.value.type, () => {
  form.value.name = ''
  resourceSearch.value = ''
  resourceItems.value = []
})

/** Fires when v-autocomplete opens/closes its dropdown. We fetch the
 *  first page only when the menu opens AND no items have been
 *  fetched for the current kind yet — so a user who never opens the
 *  dropdown (or types) doesn't trigger any network call. */
function onReceiverMenu(open) {
  if (open && receiverItems.value.length === 0) loadReceiverItems()
}
function onResourceMenu(open) {
  if (open && resourceItems.value.length === 0) loadResourceItems()
}

const { isDirty, showGuardDialog, confirmLeave, cancelLeave, markClean, init: initGuard } = useFormGuard(form)
// True while the guard dialog was raised by a dialog-close request (vs a
// route-leave), so the confirm/cancel handlers know which path to resume.
const pendingClose = ref(false)

const rules = {
  required: v => !!v || t('common.required'),
}

/** Reset all form state to a clean create-mode baseline. Called every
 *  time the dialog opens so a previous edit never bleeds into the next
 *  one. */
function resetForm() {
  form.value = {
    receiver: '',
    receiverType: 'USER',
    name: '',
    type: 'GROUP',
    canAdmin: false,
    canWrite: false,
  }
  receiverItems.value = []
  receiverSearch.value = ''
  resourceItems.value = []
  resourceSearch.value = ''
  formRef.value?.resetValidation()
}

/** Load (or reset) the form when the dialog opens. Replaces the routed
 *  page's onMounted: the component stays mounted across opens, so the
 *  work is keyed on the modelValue transition instead. */
async function loadOnOpen() {
  resetForm()
  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/security/delegate/${props.delegateId}`)
    if (data) {
      // Set the discriminator selects FIRST. Their watchers run on
      // the next microtask and reset the matching identifier
      // (receiver / name) to '' — which is fine while we're still in
      // the empty default. The `await nextTick()` below lets that
      // pass run before we write the actual values, so the loaded
      // identifier sticks instead of being wiped.
      //
      // Normalize to the uppercase enum form used by the v-select
      // items. The backend stores some delegates with lowercase
      // values ("company", "tree", …) and v-model would otherwise
      // mismatch every item, locking the select in a "Maximum
      // recursive updates exceeded" loop.
      form.value.receiverType = (data.receiverType || 'USER').toUpperCase()
      form.value.type = (data.type || 'GROUP').toUpperCase()
      await nextTick()
      form.value.receiver = data.receiver?.id || data.receiver || ''
      // TREE delegates store the DN separately — `name` is a "-"
      // placeholder server-side. Show the DN in the resource input so
      // the user can read/edit the actual subtree path.
      form.value.name = form.value.type === 'TREE'
        ? (data.dn || data.name || '')
        : (data.name || '')
      form.value.canAdmin = !!data.canAdmin
      form.value.canWrite = !!data.canWrite
    }
    loading.value = false
  }
  // Snapshot the loaded state so the guard only flags real edits.
  initGuard()
}

watch(() => props.modelValue, val => {
  if (val) loadOnOpen()
})

// --- Close handling with the unsaved-changes guard ---

/** v-dialog requests a visibility change. Opening is parent-driven, so
 *  only close requests (Esc / scrim click) reach here. */
function onDialogModel(val) {
  if (!val) requestClose()
}

/** Close request from Cancel / Esc / scrim. Vetoed (guard dialog shown)
 *  when the form has unsaved changes. */
function requestClose() {
  if (isDirty.value) {
    pendingClose.value = true
    showGuardDialog.value = true
  } else {
    emit('update:modelValue', false)
  }
}

/** Guard dialog — "Discard changes". */
function onGuardConfirm() {
  if (pendingClose.value) {
    pendingClose.value = false
    showGuardDialog.value = false
    markClean()
    emit('update:modelValue', false)
  } else {
    // Raised by onBeforeRouteLeave — let useFormGuard resume navigation.
    confirmLeave()
  }
}

/** Guard dialog — "Cancel", keep editing. */
function onGuardCancel() {
  if (pendingClose.value) {
    pendingClose.value = false
    showGuardDialog.value = false
  } else {
    cancelLeave()
  }
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  const payload = {
    receiver: form.value.receiver,
    receiverType: form.value.receiverType,
    name: form.value.name,
    type: form.value.type,
    canAdmin: form.value.canAdmin,
    canWrite: form.value.canWrite,
  }

  if (isEdit.value) {
    await api.put('rest/security/delegate', { id: Number(props.delegateId), ...payload })
  } else {
    await api.post('rest/security/delegate', payload)
  }
  saving.value = false
  markClean()
  emit('saved')
  emit('update:modelValue', false)
}

async function remove() {
  deleting.value = true
  await api.del(`rest/security/delegate/${props.delegateId}`)
  deleting.value = false
  confirmDelete.value = false
  markClean()
  emit('saved')
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* Vibrant dialog chrome (shared language with UserEditDialog). Vars on the
   .vmodal card so they reach the teleported dialog content. */
.vmodal {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .5);
  --border: rgba(var(--v-theme-on-surface), .14);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  border-radius: 20px !important;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important;
}
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 20px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; }
.vmodal-head .x { width: 36px; height: 36px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); }
.vmodal-head .x:hover { background: var(--hover); color: var(--ink); }
.vmodal-body { padding: 12px 24px 6px !important; }
.vmodal :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.vmodal :deep(.v-field__prepend-inner .v-icon) { opacity: .55; }
.vmodal :deep(.v-label) { font-weight: 600; }

.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 14px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn.ghost:hover:not(:disabled) { background: var(--hover); border-color: var(--border-2); }
.mbtn.ghost-danger { color: rgb(var(--v-theme-error)); background: transparent; border-color: rgba(var(--v-theme-error), .35); }
.mbtn.ghost-danger:hover:not(:disabled) { background: rgba(var(--v-theme-error), .08); }
.mbtn:disabled { opacity: .6; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: dspin .7s linear infinite; }
@keyframes dspin { to { transform: rotate(360deg); } }
</style>
