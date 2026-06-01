<template>
  <!-- Company create / view panel. Hosted by a `v-dialog` in
       `CompanyListView` (the primary entry point) and by the routed
       `/id/company/new` + `/id/company/:id` URLs (which now also
       resolve to `CompanyListView` and open the dialog over the list).
       Self-contained: owns its load / save / delete REST calls and
       emits events so the parent can react.

       In view mode (`isEdit`) every form field is disabled and the
       Save button is hidden — LDAP companies are immutable from this
       UI; the dialog is informational. The lock status + member
       count are surfaced as a read-only chip / line item so the
       view actually shows MORE than the form does, not less. -->
  <v-card flat class="cep">
    <v-alert v-if="demoMode" type="info" variant="tonal" density="compact" class="ma-4">
      {{ t('company.demoEdit') }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="article" class="ma-4" />

    <v-card-text v-if="!loading">
      <v-form ref="formRef" @submit.prevent="save">
        <v-text-field v-model="form.name" prepend-inner-icon="mdi-form-textbox" :label="t('common.name')" :rules="[rules.required]" :disabled="isEdit" variant="outlined" class="mb-2" />
        <!-- Scope autocomplete. Mode-agnostic UI; `:disabled="isEdit"`
             flips it to read-only in view mode (the picked value
             still renders correctly because we pre-seed
             `scopeResults` with the current scope). -->
        <v-autocomplete
          v-model="form.scope"
          prepend-inner-icon="mdi-shape-outline"
          :items="scopeResults"
          :loading="scopeLoading"
          :search="scopeSearchQuery"
          item-title="name"
          item-value="name"
          :label="t('group.scope')"
          :disabled="isEdit"
          placeholder="Sélectionner un scope…"
          variant="outlined"
          class="mb-2"
          no-filter
          clearable
          autocomplete="off"
          @update:search="onScopeSearch"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="item?.name || ''" />
          </template>
          <template #no-data>
            <v-list-item>
              <v-list-item-title>
                {{ scopeSearchQuery ? 'Aucun scope trouvé' : 'Saisissez des caractères pour rechercher' }}
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-autocomplete>

        <!-- View-only extras: lock status + member count surface what
             the form alone can't show. Only rendered in edit mode
             because they're meaningful only when an existing company
             has been loaded. -->
        <template v-if="isEdit">
          <div class="d-flex align-center ga-3 mb-3">
            <v-icon :color="form.locked ? 'error' : 'success'">
              {{ form.locked ? 'mdi-lock' : 'mdi-lock-open-variant-outline' }}
            </v-icon>
            <div class="text-body-2 text-medium-emphasis">{{ t('group.locked') }}</div>
            <v-chip size="small" :color="form.locked ? 'error' : 'success'" variant="tonal">
              {{ form.locked ? t('user.statusLocked') : t('user.statusActive') }}
            </v-chip>
          </div>

          <div v-if="form.count != null" class="d-flex align-center ga-3">
            <v-icon>mdi-account-multiple</v-icon>
            <div class="text-body-2 text-medium-emphasis">{{ t('group.members') }}</div>
            <v-chip size="small" variant="tonal">{{ form.count }}</v-chip>
          </div>
        </template>
      </v-form>
    </v-card-text>

    <div v-if="!loading" class="cep-foot">
      <button v-if="isEdit" class="mbtn ghost-danger" :disabled="saving" @click="confirmDelete = true">
        <v-icon size="18">mdi-delete</v-icon>{{ t('common.delete') }}
      </button>
      <span class="foot-sp" />
      <button class="mbtn ghost" :disabled="saving" @click="emit('cancel')">{{ isEdit ? t('common.close') : t('common.cancel') }}</button>
      <button v-if="!isEdit" class="mbtn primary" :disabled="saving" @click="save">
        <span v-if="saving" class="mspin" aria-hidden="true" /><v-icon v-else size="18">mdi-content-save</v-icon>{{ t('common.save') }}
      </button>
    </div>

    <LigojConfirmDialog
      v-model="confirmDelete"
      :title="t('company.deleteTitle')"
      :icon="TYPE_ICONS.COMPANY"
      :confirm-label="t('common.delete')"
      confirm-color="error"
      :loading="deleting"
      @confirm="remove"
    >
      {{ t('company.deleteConfirmBefore') }}<strong class="text-error">{{ form.name }}</strong>{{ t('company.deleteConfirmAfter') }}
    </LigojConfirmDialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useApi, useErrorStore, useI18nStore } from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'
import LigojConfirmDialog from './VibrantConfirmDialog.vue'

const props = defineProps({
  /**
   * Company name to view, or null to create a new one. Drives the
   * REST calls below — `null` switches the form into "new" mode (no
   * pre-load, name field enabled, no delete button, Save button
   * visible).
   */
  companyId: { type: [String, Number, null], default: null },
})
const emit = defineEmits(['saved', 'deleted', 'cancel'])

const api = useApi()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const demoMode = ref(false)

const scopeSearchQuery = ref('')
const scopeResults = ref([])
const scopeAll = ref([])
const scopeLoading = ref(false)
let scopeDebounce = null

const isEdit = computed(() => props.companyId != null && props.companyId !== '' && props.companyId !== 'new')

const form = ref({
  name: '',
  scope: '',
  locked: false,
  count: null,
})

const rules = {
  required: (v) => !!v || t('common.required'),
}

const DEMO_COMPANIES = [
  { name: 'Ligoj', scope: 'Company', locked: false, count: 4 },
  { name: 'AcmeCorp', scope: 'Company', locked: false, count: 2 },
  { name: 'TechSolutions', scope: 'Company', locked: false, count: 2 },
]

/* --- Scope auto-suggest (small dataset, filtered locally) --- */

async function loadAllScopes() {
  scopeLoading.value = true
  try {
    const resp = await api.get('rest/service/id/container-scope/COMPANY')
    scopeAll.value = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : [])
    scopeResults.value = scopeAll.value
  } catch (err) {
    console.error('Scope preload failed:', err)
    if (form.value.scope) {
      scopeAll.value = [{ name: form.value.scope }]
      scopeResults.value = scopeAll.value
    } else {
      scopeAll.value = []
      scopeResults.value = []
    }
  } finally {
    scopeLoading.value = false
  }
}

function onScopeSearch(query) {
  scopeSearchQuery.value = query || ''
  clearTimeout(scopeDebounce)
  scopeDebounce = setTimeout(() => filterScopes(query), 300)
}

function filterScopes(query) {
  // After picking a scope, Vuetify echoes the selected name back through
  // @update:search — if we treat that as a filter query we narrow the
  // list to just the picked item and the user can't switch on re-open.
  if (!query || query === form.value.scope) {
    scopeResults.value = scopeAll.value
    return
  }
  const q = query.toLowerCase()
  scopeResults.value = scopeAll.value.filter((s) => (s.name || '').toLowerCase().includes(q))
  if (import.meta.env.DEV && scopeResults.value.length === 0 && query) {
    const DEMO = [{ name: 'Functional' }, { name: 'Project' }, { name: 'Enterprise' }]
    scopeResults.value = DEMO.filter((s) => s.name.toLowerCase().includes(q))
  }
}

onBeforeUnmount(() => clearTimeout(scopeDebounce))

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/service/id/company/${encodeURIComponent(props.companyId)}`)
    if (data && !data.code) {
      form.value.name = data.name || ''
      form.value.scope = data.scope || ''
      form.value.locked = !!data.locked
      form.value.count = data.count ?? null
    } else {
      demoMode.value = true
      errorStore.clear()
      const demo = DEMO_COMPANIES.find((c) => c.name === props.companyId)
      if (demo) {
        form.value.name = demo.name
        form.value.scope = demo.scope
        form.value.locked = !!demo.locked
        form.value.count = demo.count ?? null
      }
    }
    await loadAllScopes()
    loading.value = false
  } else {
    // Probe the list to detect a missing/unreachable IDP. Empty
    // result is fine (200 + []); only `code` indicates a real
    // failure.
    const check = await api.get('rest/service/id/company?rows=1&page=1')
    if (!check || check.code) {
      demoMode.value = true
      errorStore.clear()
    }
    await loadAllScopes()
  }
})

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  if (demoMode.value) {
    errorStore.push({ message: t('company.demoSave'), status: 0 })
    return
  }

  // Backend expects the container-scope Integer id, not the display
  // name — resolve from the preloaded scopeAll list.
  const scopeEntry = scopeAll.value.find((s) => s.name === form.value.scope)
  if (!scopeEntry) {
    errorStore.push({ message: `Unknown scope: ${form.value.scope}`, status: 0 })
    return
  }

  saving.value = true
  const payload = { name: form.value.name, scope: scopeEntry.id }
  try {
    if (isEdit.value) {
      await api.put('rest/service/id/company', payload)
    } else {
      await api.post('rest/service/id/company', payload)
    }
    emit('saved', { name: form.value.name })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (demoMode.value) {
    errorStore.push({ message: t('company.demoDelete'), status: 0 })
    confirmDelete.value = false
    return
  }
  deleting.value = true
  try {
    await api.del(`rest/service/id/company/${encodeURIComponent(props.companyId)}`)
    confirmDelete.value = false
    emit('deleted', { name: props.companyId })
  } finally {
    deleting.value = false
  }
}
</script>

<style>
/*
 * Safety net for the ligojLight custom theme: --v-theme-on-surface-variant
 * defaults to a near-white grey, making v-list-item titles/subtitles
 * invisible inside autocomplete dropdowns. Forces a readable colour
 * on `.v-autocomplete__content`. Non-scoped intentionally — the
 * v-menu content is teleported to <body>, so scoped CSS never
 * reaches it. Lifted verbatim from CompanyEditView.vue (now removed).
 */
.v-autocomplete__content .v-list-item-title {
  color: rgb(var(--v-theme-on-surface)) !important;
}
.v-autocomplete__content .v-list-item-subtitle {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 0.7;
}
</style>

<style scoped>
.cep {
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --border: rgba(var(--v-theme-on-surface), .14);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  background: transparent !important;
}
.cep :deep(.v-card-text) { padding: 4px 24px 4px !important; }
.cep :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.cep :deep(.v-field__prepend-inner .v-icon) { opacity: .55; }
.cep :deep(.v-label) { font-weight: 600; }
.cep-foot { display: flex; align-items: center; gap: 10px; padding: 12px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn.ghost:hover:not(:disabled) { background: var(--hover); border-color: var(--border-2); }
.mbtn.ghost-danger { color: rgb(var(--v-theme-error)); background: transparent; border-color: rgba(var(--v-theme-error), .35); }
.mbtn.ghost-danger:hover:not(:disabled) { background: rgba(var(--v-theme-error), .08); }
.mbtn:disabled { opacity: .6; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: cepspin .7s linear infinite; }
@keyframes cepspin { to { transform: rotate(360deg); } }
</style>
