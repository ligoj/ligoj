<template>
  <div>
    <!-- User create/edit popup (chantier I.2). Replaces the former routed
         UserEditView page; hosted by UserListView, opened from the "New
         user" button and the row gear menu. model-value is bound one-way
         so a close request (Cancel / Esc / scrim) can be vetoed by the
         unsaved-changes guard before it actually closes. -->
    <v-dialog :model-value="modelValue" @update:model-value="onDialogModel" max-width="700" scrollable>
      <v-card>
        <!-- Edit mode includes the user id (login) as a primary-color
             span so the user sees who they're editing the moment the
             dialog opens, matching the convention used by the group
             details and group-members dialogs. Sourced from the prop
             — `form.id` would lag until the load completes. -->
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="primary">{{ TYPE_ICONS.USER }}</v-icon>
          <span>{{ isEdit ? t('user.edit') : t('user.new') }}</span>
          <span v-if="isEdit" class="text-primary">{{ userId }}</span>
        </v-card-title>

        <v-card-text>
          <v-alert v-if="demoMode" type="info" variant="tonal" density="compact" class="mb-4">
            {{ t('user.demoEdit') }}
          </v-alert>

          <v-skeleton-loader v-if="loading" type="article" />

          <template v-else>
            <v-form ref="formRef" @submit.prevent="save">
              <v-text-field v-model="form.id" :label="t('user.login')" prepend-inner-icon="mdi-account" :rules="[rules.required]" :disabled="isEdit" :hint="isEdit ? '' : t('user.loginHint')" persistent-hint variant="outlined"
                class="mb-2" autofocus />
              <!-- First + last name grouped on a single row (stacks below sm). -->
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.firstName" :label="t('user.firstName')" prepend-inner-icon="mdi-account-outline" :rules="[rules.required]" variant="outlined" class="mb-2" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.lastName" :label="t('user.lastName')" prepend-inner-icon="mdi-account-outline" :rules="[rules.required]" variant="outlined" class="mb-2" />
                </v-col>
              </v-row>
              <!-- Auto-suggest for company. Queries rest/service/id/company as the
                   user types (300 ms debounced). v-model stores the company name
                   as a string, matching the payload contract of rest/service/id/user. -->
              <v-autocomplete v-model="form.company" :items="companyResults" :loading="companyLoading" :search="companySearchQuery" item-title="name" item-value="name" :label="t('user.company')" prepend-inner-icon="mdi-domain"
                placeholder="Rechercher une entité…" variant="outlined" class="mb-2" no-filter clearable autocomplete="off" @update:search="onCompanySearch">
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="item?.name || ''">
                    <template v-if="item?.scope || item?.count !== undefined" #subtitle>
                      <span v-if="item?.scope" class="text-caption mr-2">{{ item.scope }}</span>
                      <v-chip v-if="item?.count !== undefined" size="x-small" variant="tonal" class="mr-1">{{ item.count }} {{ t('user.title').toLowerCase() }}</v-chip>
                    </template>
                  </v-list-item>
                </template>
                <template #no-data>
                  <v-list-item>
                    <v-list-item-title>
                      {{ companySearchQuery ? 'Aucune entité trouvée' : 'Saisissez des caractères pour rechercher' }}
                    </v-list-item-title>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <!-- Free-text multi-email input (chantier D4). v-combobox +
                   multiple + chips lets the user type any email (no
                   autocomplete source) and confirm with Enter or Tab;
                   existing emails are restored as chips at load time. -->
              <v-combobox v-model="form.mails" :label="t('user.emails')" prepend-inner-icon="mdi-email-outline" multiple chips closable-chips variant="outlined" class="mb-2" :hint="t('user.emailsHint')" persistent-hint autocomplete="off" />
              <!-- Auto-suggest for groups (multi-select). Queries
                   rest/service/id/group as the user types (300 ms debounced).
                   v-model holds an array of group **names** (strings),
                   matching the payload contract of rest/service/id/user. -->
              <v-autocomplete v-model="groups" v-model:menu="groupMenu" :items="groupResults" :loading="groupLoading" :search="groupSearchQuery" item-title="name" item-value="name"
                :label="t('user.groups')" prepend-inner-icon="mdi-account-group" placeholder="Ajouter un groupe…" variant="outlined" class="mb-2" multiple chips closable-chips no-filter clearable autocomplete="off" @update:search="onGroupSearch"
                @update:model-value="onGroupModelUpdate">
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="item?.name || ''" />
                </template>
                <template #no-data>
                  <v-list-item>
                    <v-list-item-title>
                      {{ groupSearchQuery ? 'Aucun groupe trouvé' : 'Saisissez des caractères pour rechercher' }}
                    </v-list-item-title>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-form>

            <!-- Account actions (edit mode only). Rearranged per Fabrice's
                 review: the former separate "Actions" card with a row of
                 tonal buttons is now an inline bordered list inside the
                 dialog, consistent with the row gear menu of the list. -->
            <template v-if="isEdit">
              <v-divider class="my-4" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">{{ t('user.actions') }}</div>
              <v-list border rounded density="compact" bg-color="transparent">
                <v-list-item :prepend-icon="locked ? 'mdi-lock-open-variant' : 'mdi-lock'" :title="locked ? t('user.unlock') : t('user.lock')" @click="startAction(locked ? 'unlock' : 'lock')" />
                <v-list-item :prepend-icon="isolated ? 'mdi-account-check' : 'mdi-account-off'" :title="isolated ? t('user.restore') : t('user.isolate')"
                  @click="startAction(isolated ? 'restore' : 'isolate')" />
                <v-list-item prepend-icon="mdi-lock-reset" :title="t('user.resetPassword')" @click="startAction('resetPassword')" />
              </v-list>
            </template>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-btn v-if="isEdit" color="error" variant="tonal" :disabled="loading" @click="confirmDelete = true">
            <v-icon start>mdi-delete</v-icon> {{ t('common.delete') }}
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="requestClose">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" :disabled="loading" @click="save">
            <v-icon start>mdi-content-save</v-icon> {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <LigojConfirmDialog v-model="confirmDelete" :title="t('user.deleteTitle')" :icon="TYPE_ICONS.USER" :confirm-label="t('common.delete')" confirm-color="error" :loading="deleting" @confirm="remove">
      {{ t('user.deleteConfirmBefore') }}<strong class="text-error">{{ form.id }}</strong>{{ t('user.deleteConfirmAfter') }}
    </LigojConfirmDialog>

    <!-- Unsaved-changes guard. Triggered either by a dialog close request
         (Cancel / Esc / scrim) or by useFormGuard's onBeforeRouteLeave when
         navigating away from the list with the dialog still open.
         persistent: only the explicit buttons dismiss it, so pendingClose
         is always reset through onGuardConfirm/onGuardCancel. -->
    <LigojConfirmDialog v-model="showGuardDialog" :title="t('common.unsavedTitle')" icon="mdi-content-save-alert" icon-color="warning" :message="t('common.unsavedMsg')" :confirm-label="t('common.discard')" confirm-color="warning" persistent
      @confirm="onGuardConfirm" @cancel="onGuardCancel" />

    <!-- Chantier D2 (rattrapage): mirror the UserListView pattern so the
         login is rendered in bold red here too. The previous monolithic
         `user.<action>Confirm` message with {id} interpolation kept the
         name as plain text, which felt visually weaker than the same
         action triggered from the list row. -->
    <LigojConfirmDialog v-model="actionDialog" :title="t('user.' + actionType)" :icon="TYPE_ICONS.USER" :loading="actionLoading" @confirm="confirmAction">
      {{ t('user.' + actionType + 'ConfirmBefore') }}<strong class="text-error">{{ form.id }}</strong>{{ t('user.' + actionType + 'ConfirmAfter') }}
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useApi, useFormGuard, useErrorStore, useI18nStore, LigojConfirmDialog } from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'

const props = defineProps({
  // Dialog visibility (v-model).
  modelValue: { type: Boolean, default: false },
  // User login to edit; null/absent means create mode.
  userId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

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
const groups = ref([])
const locked = ref(false)
const isolated = ref(false)
const actionDialog = ref(false)
const actionType = ref('')
const actionLoading = ref(false)

// --- Company auto-suggest state ---
const companySearchQuery = ref('')
const companyResults = ref([])
const companyLoading = ref(false)
let companyDebounce = null

// --- Group auto-suggest state (multi-select) ---
const groupSearchQuery = ref('')
const groupResults = ref([])
const groupLoading = ref(false)
const groupMenu = ref(false)
const groupsPreloaded = ref(false)
let groupDebounce = null
let groupMenuTimer = null

const isEdit = computed(() => !!props.userId)

const form = ref({
  id: '',
  firstName: '',
  lastName: '',
  company: '',
  // Chantier D4: emails as a list. Backend response carries `mails: [...]`;
  // a string fallback at load time keeps tolerance for any legacy payload.
  mails: [],
})

// useFormGuard still drives the dirty tracking (snapshot + deep watch) and
// keeps its onBeforeRouteLeave guard for the "navigate away with the dialog
// open" case. The dialog's own close (Cancel / Esc / scrim) is intercepted
// separately below — onBeforeRouteLeave never fires without a route change.
// The tracked value merges `form` with the `groups` multi-select (a separate
// ref) so editing only the groups still flags the form as dirty.
const { isDirty, showGuardDialog, markClean, confirmLeave, cancelLeave, init: initGuard } =
  useFormGuard(computed(() => ({ ...form.value, groups: groups.value })))
// True while the guard dialog was raised by a dialog-close request (vs a
// route-leave), so the confirm/cancel handlers know which path to resume.
const pendingClose = ref(false)

const rules = {
  required: v => !!v || t('common.required'),
}

// --- Company auto-suggest logic ---

/** Called on every keystroke in the autocomplete. Debounced 300 ms. */
function onCompanySearch(query) {
  companySearchQuery.value = query || ''
  clearTimeout(companyDebounce)
  companyDebounce = setTimeout(() => searchCompanies(query), 300)
}

async function searchCompanies(query) {
  if (!query || query.length < 1) {
    companyResults.value = []
    return
  }
  companyLoading.value = true
  try {
    // Direct URL with un-encoded brackets — the legacy DataTables backend
    // expects `search[value]=...` literally.
    const url = `rest/service/id/company?search[value]=${encodeURIComponent(query)}&rows=20&page=1&sidx=name&sord=asc`
    const resp = await api.get(url)
    // Defensive: api.get may return the wrapper { data: [...] } or the
    // array directly depending on the endpoint's content-type handling.
    companyResults.value = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : [])
    // Dev-only fallback: gated behind import.meta.env.DEV so demo
    // data NEVER leaks to production. When LDAP isn't configured in
    // dev, surface a small demo list so the autosuggest can be
    // visually validated. In prod, an empty backend response stays
    // empty — the real LDAP integration will populate it.
    if (import.meta.env.DEV && companyResults.value.length === 0 && query) {
      const DEMO = [
        { name: 'Ligoj', scope: 'Company', count: 4 },
        { name: 'AcmeCorp', scope: 'Company', count: 2 },
        { name: 'TechSolutions', scope: 'Company', count: 2 },
      ]
      const q = query.toLowerCase()
      companyResults.value = DEMO.filter(c => c.name.toLowerCase().includes(q))
    }
  } catch (err) {
    console.error('Company search failed:', err)
    companyResults.value = []
  } finally {
    companyLoading.value = false
  }
}

/** When editing an existing user, the company is already set but the
 *  autocomplete's item list is empty — pre-seed with the current value
 *  so v-autocomplete can render its label correctly on open. */
async function ensureCurrentCompanyInResults(name) {
  if (!name) return
  try {
    const url = `rest/service/id/company?search[value]=${encodeURIComponent(name)}&rows=5&page=1&sidx=name&sord=asc`
    const resp = await api.get(url)
    const items = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : [])
    companyResults.value = items.length ? items : [{ name }]
  } catch {
    companyResults.value = [{ name }]
  }
}

// --- Group auto-suggest logic (multi-select) ---

/** Called on every keystroke in the group autocomplete. Debounced 300 ms. */
function onGroupSearch(query) {
  groupSearchQuery.value = query || ''
  clearTimeout(groupDebounce)
  groupDebounce = setTimeout(() => searchGroups(query), 300)
}

/** After picking or removing a chip, reset the search field so the user
 *  can immediately type the next group name. Vuetify v4 doesn't clear
 *  the inline query automatically in multi-select mode. */
function onGroupModelUpdate() {
  groupSearchQuery.value = ''
  groupResults.value = []
}

/** Load the first page of available groups (20) for the dropdown. Called
 *  lazily when the dropdown opens, for both create and edit modes, so the
 *  user always sees a list without having to type. The user's already-
 *  assigned groups are merged in so their chips keep rendering. */
async function preloadGroups() {
  groupsPreloaded.value = true
  groupLoading.value = true
  try {
    const url = 'rest/service/id/group?rows=20&page=1&sidx=name&sord=asc'
    const resp = await api.get(url)
    let rows = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : [])
    // Keep the user's already-assigned groups present so their chips keep
    // rendering even when those groups fall outside this first page.
    for (const name of groups.value) {
      if (!rows.some(g => (g.name || g) === name)) rows.unshift({ name })
    }
    groupResults.value = rows
  } catch (err) {
    console.error('Group preload failed:', err)
    groupResults.value = groups.value.map(n => ({ name: n }))
  } finally {
    groupLoading.value = false
  }
}

async function searchGroups(query) {
  if (!query || query.length < 1) {
    groupResults.value = []
    return
  }
  groupLoading.value = true
  try {
    const url = `rest/service/id/group?search[value]=${encodeURIComponent(query)}&rows=20&page=1&sidx=name&sord=asc`
    const resp = await api.get(url)
    groupResults.value = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : [])
    // Dev-only fallback (same gating as company) — never leaks to
    // production. import.meta.env.DEV is true in `vite dev`, false
    // in `vite build`.
    if (import.meta.env.DEV && groupResults.value.length === 0 && query) {
      const DEMO = [
        { name: 'Engineering' },
        { name: 'Management' },
        { name: 'DevOps' },
        { name: 'Marketing' },
        { name: 'Sales' },
      ]
      const q = query.toLowerCase()
      groupResults.value = DEMO.filter(g => g.name.toLowerCase().includes(q))
    }
  } catch (err) {
    console.error('Group search failed:', err)
    groupResults.value = []
  } finally {
    groupLoading.value = false
  }
}

/** Pre-seed groupResults with the user's existing groups so Vuetify can
 *  render their chips on edit without an explicit search. Takes an array
 *  of group **names** (strings). */
function ensureCurrentGroupsInResults(names) {
  if (!Array.isArray(names) || !names.length) return
  groupResults.value = names.map(n => ({ name: n }))
}

// Demo users matching UserListView
const DEMO_USERS = [
  { id: 'admin', firstName: 'Admin', lastName: 'User', company: 'Ligoj', mails: ['admin@ligoj.org'], groups: [{ name: 'Engineering' }, { name: 'Management' }] },
  { id: 'jdupont', firstName: 'Jean', lastName: 'Dupont', company: 'Ligoj', mails: ['jean.dupont@ligoj.org'], groups: [{ name: 'Engineering' }, { name: 'DevOps' }] },
  { id: 'mmartin', firstName: 'Marie', lastName: 'Martin', company: 'AcmeCorp', mails: ['marie.martin@acme.com'], groups: [{ name: 'Marketing' }] },
  { id: 'pdurand', firstName: 'Pierre', lastName: 'Durand', company: 'AcmeCorp', mails: ['pierre.durand@acme.com'], groups: [{ name: 'Engineering' }] },
  { id: 'sleblanc', firstName: 'Sophie', lastName: 'Leblanc', company: 'TechSolutions', mails: ['sophie.leblanc@techsol.com'], groups: [{ name: 'DevOps' }] },
  { id: 'tmoreau', firstName: 'Thomas', lastName: 'Moreau', company: 'TechSolutions', mails: ['thomas.moreau@techsol.com'], groups: [{ name: 'Sales' }] },
  { id: 'crichard', firstName: 'Claire', lastName: 'Richard', company: 'Ligoj', mails: ['claire.richard@ligoj.org'], groups: [{ name: 'Management' }] },
  { id: 'agarcia', firstName: 'Antoine', lastName: 'Garcia', company: 'Ligoj', mails: ['antoine.garcia@ligoj.org'], groups: [{ name: 'Engineering' }] },
]

function loadDemoUser(id) {
  const user = DEMO_USERS.find(u => u.id === id)
  if (user) {
    form.value.id = user.id
    form.value.firstName = user.firstName
    form.value.lastName = user.lastName
    form.value.company = user.company
    // Chantier D4: hydrate the full mails list (the demo seed already
    // carries an array, but be defensive against any string fallback).
    form.value.mails = Array.isArray(user.mails) ? [...user.mails] : user.mails ? [user.mails] : []
    // Normalize groups to an array of names (strings) so v-autocomplete
    // with item-value="name" can roundtrip them through v-model.
    groups.value = (user.groups || []).map(g => g.name || g)
    ensureCurrentGroupsInResults(groups.value)
    locked.value = !!user.locked
    isolated.value = !!user.isolated
  }
}

/** Reset all form state to a clean create-mode baseline. Called every time
 *  the dialog opens so a previous edit never bleeds into the next one. */
function resetForm() {
  form.value = { id: '', firstName: '', lastName: '', company: '', mails: [] }
  groups.value = []
  locked.value = false
  isolated.value = false
  demoMode.value = false
  companyResults.value = []
  companySearchQuery.value = ''
  groupResults.value = []
  groupSearchQuery.value = ''
  groupMenu.value = false
  groupsPreloaded.value = false
  clearTimeout(groupMenuTimer)
  formRef.value?.resetValidation()
}

/** Load (or reset) the form when the dialog opens. Replaces the routed
 *  page's onMounted: the component stays mounted across opens, so the work
 *  is keyed on the modelValue transition instead. */
async function loadOnOpen() {
  resetForm()
  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/service/id/user/${props.userId}`)
    if (data && !data.code) {
      form.value.id = data.id || ''
      form.value.firstName = data.firstName || ''
      form.value.lastName = data.lastName || ''
      form.value.company = data.company || ''
      // Chantier D4: keep the entire mails array, with string fallback
      // for any legacy payload that stored a single email as `mail`.
      form.value.mails = Array.isArray(data.mails) ? [...data.mails]
        : data.mail ? [data.mail] : []
      // Normalize groups to an array of names (strings) so v-autocomplete
      // with item-value="name" can roundtrip them through v-model.
      groups.value = (data.groups || []).map(g => g.name || g)
      locked.value = !!data.locked
      isolated.value = !!data.isolated
      // Pre-seed the company suggest with the current value so the input
      // displays it correctly without an explicit search.
      await ensureCurrentCompanyInResults(form.value.company)
      // Pre-seed groupResults with stubs so v-autocomplete renders the
      // existing chips immediately (no API roundtrip needed).
      ensureCurrentGroupsInResults(groups.value)
    } else {
      // API unavailable — use demo data
      demoMode.value = true
      errorStore.clear()
      loadDemoUser(props.userId)
      // Pre-seed in demo mode too, with a stub object.
      if (form.value.company) {
        companyResults.value = [{ name: form.value.company }]
      }
    }
    loading.value = false
  } else {
    // Check if API is available. Use a list probe (rows=1) so the check
    // doesn't depend on a specific hardcoded entity that may or may not
    // exist in the real LDAP backend.
    const check = await api.get('rest/service/id/user?rows=1&page=1')
    if (!check || check.code) {
      demoMode.value = true
      errorStore.clear()
    }
    // Preload the group list and auto-open the dropdown so the available
    // groups are visible (per Fabrice's UX feedback, chantier B). Deferred
    // so the dropdown opens once the dialog transition has settled.
    await preloadGroups()
    groupMenuTimer = setTimeout(() => { groupMenu.value = true }, 350)
  }
  // Snapshot the loaded state so the guard only flags real edits.
  initGuard()
}

watch(() => props.modelValue, val => {
  if (val) loadOnOpen()
})

// Lazily preload the available groups when the dropdown opens — for edit
// mode as well as create, so opening the Groups field always shows a list
// without typing. groupsPreloaded prevents a duplicate fetch on create
// mode, where loadOnOpen already preloaded before auto-opening the menu.
watch(groupMenu, open => {
  if (open && !groupsPreloaded.value && !groupSearchQuery.value) {
    preloadGroups()
  }
})

// --- Close handling with the unsaved-changes guard ---

/** v-dialog requests a visibility change. Opening is parent-driven, so only
 *  close requests (Esc / scrim click) reach here. */
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

  if (demoMode.value) {
    errorStore.push({ message: t('user.demoSave'), status: 0 })
    return
  }

  saving.value = true
  const payload = {
    id: form.value.id,
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    company: form.value.company,
    // Chantier D4: send the full mails list — fixes a latent bug where
    // the previous single-string `mail` field would drop every address
    // past the first at save time.
    mails: form.value.mails,
    // groups is an array of names (strings). Defensive `.map(g => g.name || g)`
    // in case any legacy object slipped through.
    groups: groups.value.map(g => g.name || g),
  }

  if (isEdit.value) {
    await api.put('rest/service/id/user', payload)
  } else {
    await api.post('rest/service/id/user', payload)
  }
  saving.value = false
  markClean()
  emit('saved')
  emit('update:modelValue', false)
}

async function remove() {
  if (demoMode.value) {
    errorStore.push({ message: t('user.demoDelete'), status: 0 })
    confirmDelete.value = false
    return
  }

  deleting.value = true
  await api.del(`rest/service/id/user/${props.userId}`)
  deleting.value = false
  confirmDelete.value = false
  markClean()
  emit('saved')
  emit('update:modelValue', false)
}

function startAction(type) {
  actionType.value = type
  actionDialog.value = true
}

async function confirmAction() {
  if (demoMode.value) {
    errorStore.push({ message: t('user.demoAction'), status: 0 })
    actionDialog.value = false
    return
  }
  actionLoading.value = true
  const id = form.value.id
  const actions = {
    lock: () => api.del(`rest/service/id/user/${id}/lock`),
    unlock: () => api.put(`rest/service/id/user/${id}/unlock`),
    isolate: () => api.del(`rest/service/id/user/${id}/isolate`),
    restore: () => api.put(`rest/service/id/user/${id}/restore`),
    resetPassword: () => api.put(`rest/service/id/user/${id}/reset`),
  }
  await actions[actionType.value]()
  actionLoading.value = false
  actionDialog.value = false
  // Update local state so the action list relabels immediately.
  if (actionType.value === 'lock') locked.value = true
  if (actionType.value === 'unlock') locked.value = false
  if (actionType.value === 'isolate') isolated.value = true
  if (actionType.value === 'restore') isolated.value = false
  // Keep the list behind the dialog in sync (status icon, gear labels).
  emit('saved')
}
</script>

<style>
/*
 * Safety net for the ligojLight custom theme: --v-theme-on-surface-variant
 * defaults to a near-white grey, making v-list-item titles/subtitles
 * invisible inside autocomplete dropdowns. We force a readable colour on
 * `.v-autocomplete__content` (always stamped by Vuetify on every
 * v-autocomplete overlay content). `!important` wins over @layer-scoped
 * Vuetify defaults. Non-scoped intentionally — the v-menu content is
 * teleported to <body>, so scoped CSS never reaches it.
 *
 * Note Vuetify 4: in the #item slot scope, `item` is the raw item
 * directly (not a {raw, title, value, props} wrapper as in v3). The
 * wrapper moved to `internalItem`. So access fields via `item.name`,
 * never `item.raw.name`.
 */
.v-autocomplete__content .v-list-item-title {
  color: rgb(var(--v-theme-on-surface)) !important;
}

.v-autocomplete__content .v-list-item-subtitle {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 0.7;
}
</style>
