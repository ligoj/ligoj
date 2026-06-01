<template>
  <!-- Form body for creating / editing a group. Hosted by a `v-dialog`
       in `GroupListView` (the primary entry point) and also by the
       routed `/id/group/new` + `/id/group/:id` URLs, which now also
       resolve to `GroupListView` and open the dialog over the list.

       Self-contained: owns its load / save / delete REST calls, and
       emits events so the parent can react (close the dialog, refresh
       the table, …). No router awareness — receives the editing
       target through the `groupId` prop (null = new). -->
  <v-card flat>
    <v-alert v-if="demoMode" type="info" variant="tonal" density="compact" class="ma-4">
      {{ t('group.demoEdit') }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="card, actions" class="ma-4" />

    <!-- In view mode (`isEdit`) every field is disabled — LDAP groups
         are immutable in practice once they exist, so making this
         look-but-don't-touch matches reality. The `<v-form>` wrapper
         still validates (helpful for the create flow); the disabled
         state is purely visual / no-op in view mode. -->
    <v-card-text v-if="!loading">
      <v-form ref="formRef" @submit.prevent="save">
        <v-text-field v-model="form.name" prepend-inner-icon="mdi-form-textbox" :label="t('common.name')" :rules="[rules.required]" :disabled="isEdit" variant="outlined" class="mb-2" />
        <v-autocomplete v-model="form.scope" prepend-inner-icon="mdi-shape-outline" :label="t('group.scope')" :items="availableScopes" :loading="scopesLoading" :disabled="isEdit" clearable variant="outlined" class="mb-2"
          autocomplete="off" />
        <!-- Parent group: lazy server-backed autosuggest. No groups are
             loaded until the dropdown opens — the former mount-time
             bulk GET doesn't scale to 100k+ groups. -->
        <v-autocomplete
          v-model="form.parent"
          prepend-inner-icon="mdi-file-tree-outline"
          :items="parentResults"
          :loading="parentLoading"
          :search="parentSearchQuery"
          item-title="name"
          item-value="name"
          :label="t('group.parent')"
          :hint="isEdit ? undefined : t('group.parentHint')"
          :persistent-hint="!isEdit"
          :disabled="isEdit"
          variant="outlined"
          class="mb-2"
          no-filter
          clearable
          autocomplete="off"
          @update:menu="onParentMenu"
          @update:search="onParentSearch"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="item?.name || ''" />
          </template>
        </v-autocomplete>
      </v-form>
    </v-card-text>

    <v-card-actions v-if="!loading">
      <v-btn v-if="isEdit" color="error" variant="tonal" :disabled="saving" @click="confirmDelete = true">
        <v-icon start>mdi-delete</v-icon> {{ t('common.delete') }}
      </v-btn>
      <v-spacer />
      <!-- View mode: a single "Close" button reads as the only sane
           action when nothing is editable. Create mode keeps the
           usual Cancel + Save pair so the form validation has a
           submit target. -->
      <v-btn variant="text" :disabled="saving" @click="emit('cancel')">
        {{ isEdit ? t('common.close') : t('common.cancel') }}
      </v-btn>
      <v-btn v-if="!isEdit" color="primary" variant="elevated" :loading="saving" @click="save">
        <v-icon start>mdi-content-save</v-icon> {{ t('common.save') }}
      </v-btn>
    </v-card-actions>

    <LigojConfirmDialog
      v-model="confirmDelete"
      :title="t('group.deleteTitle')"
      :icon="TYPE_ICONS.GROUP"
      :confirm-label="t('common.delete')"
      confirm-color="error"
      :loading="deleting"
      @confirm="remove"
    >
      {{ t('group.deleteConfirmBefore') }}<strong class="text-error">{{ form.name }}</strong>{{ t('group.deleteConfirmAfter') }}
    </LigojConfirmDialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi, useErrorStore, useI18nStore } from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'
import LigojConfirmDialog from './VibrantConfirmDialog.vue'

const props = defineProps({
  /**
   * The group name to edit, or null to create a new one. Drives the
   * REST calls below — `null` switches the form into "new" mode (no
   * pre-load, name field enabled, no delete button).
   *
   * Reactive: the dialog `v-if`s on its open flag so a fresh mount
   * fires for every (open, groupId) combination, meaning a watcher
   * isn't strictly needed. We still take it as a prop (not a
   * synchronous arg) so the parent can swap targets without a
   * remount if that ever becomes useful.
   */
  groupId: { type: [String, Number, null], default: null },
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
const availableScopes = ref([])
const parentResults = ref([])
const parentLoading = ref(false)
const parentSearchQuery = ref('')
const parentLoaded = ref(false)
let parentDebounce = null
const scopeAll = ref([])
const scopesLoading = ref(false)

const isEdit = computed(() => props.groupId != null && props.groupId !== '' && props.groupId !== 'new')

const form = ref({
  name: '',
  scope: '',
  parent: '',
})

const rules = {
  required: (v) => !!v || t('common.required'),
}

const DEMO_GROUPS = [
  { name: 'Engineering', scope: 'Group' },
  { name: 'Marketing', scope: 'Group' },
  { name: 'DevOps', scope: 'Group' },
  { name: 'Management', scope: 'Group' },
  { name: 'Sales', scope: 'Group' },
]

/**
 * Pull the list of group container scopes so the Scope field surfaces
 * an autocomplete. Endpoint may return a bare array or a `{data: []}`
 * envelope depending on the identity provider — accept both, fall
 * back to a static list when the IDP isn't reachable.
 */
async function loadGroupScopes() {
  scopesLoading.value = true
  try {
    const data = await api.get('rest/service/id/container-scope/group')
    const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : null)
    if (rows) {
      scopeAll.value = rows
      availableScopes.value = rows.map((s) => s.name).filter(Boolean)
    } else {
      scopeAll.value = []
      availableScopes.value = ['Group', 'Department', 'Team', 'Project']
    }
  } catch {
    scopeAll.value = []
    availableScopes.value = ['Group', 'Department', 'Team', 'Project']
  } finally {
    scopesLoading.value = false
  }
}

/* --- Parent group autosuggest (lazy, server-backed) --- */

function onParentMenu(open) {
  if (open && !parentLoaded.value) loadParentGroups('')
}

function onParentSearch(query) {
  parentSearchQuery.value = query || ''
  clearTimeout(parentDebounce)
  parentDebounce = setTimeout(() => loadParentGroups(query), 300)
}

async function loadParentGroups(query) {
  parentLoaded.value = true
  parentLoading.value = true
  try {
    const url = `rest/service/id/group?search[value]=${encodeURIComponent(query || '')}&rows=20&page=1&sidx=name&sord=asc`
    const resp = await api.get(url)
    let rows = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : [])
    if (import.meta.env.DEV && rows.length === 0) {
      const q = (query || '').toLowerCase()
      rows = DEMO_GROUPS.filter(g => g.name.toLowerCase().includes(q))
    }
    if (form.value.parent && !rows.some(g => (g.name || g) === form.value.parent)) {
      rows = [{ name: form.value.parent }, ...rows]
    }
    parentResults.value = rows
  } catch (err) {
    console.error('Parent group search failed:', err)
    parentResults.value = form.value.parent ? [{ name: form.value.parent }] : []
  } finally {
    parentLoading.value = false
  }
}

onMounted(async () => {
  loadGroupScopes()

  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/service/id/group/${props.groupId}`)
    if (data && !data.code) {
      form.value.name = data.name || ''
      form.value.scope = data.scope || ''
      form.value.parent = data.parent || ''
      if (form.value.parent) parentResults.value = [{ name: form.value.parent }]
    } else {
      demoMode.value = true
      errorStore.clear()
      const demo = DEMO_GROUPS.find(g => g.name === props.groupId)
      if (demo) {
        form.value.name = demo.name
        form.value.scope = demo.scope
        form.value.parent = ''
      }
    }
    loading.value = false
  } else {
    // Probe the list to detect a missing/unreachable IDP. Empty result
    // is fine (200 + []), only `code` indicates a real failure.
    const check = await api.get('rest/service/id/group?rows=1&page=1')
    if (!check || check.code) {
      demoMode.value = true
      errorStore.clear()
    }
  }
})

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  if (demoMode.value) {
    errorStore.push({ message: t('group.demoSave'), status: 0 })
    return
  }

  // Backend expects the container-scope Integer id, not the display
  // name — resolve from the preloaded scopeAll list.
  const scopeEntry = scopeAll.value.find(s => s.name === form.value.scope)
  if (!scopeEntry) {
    errorStore.push({ message: `Unknown scope: ${form.value.scope}`, status: 0 })
    return
  }

  saving.value = true
  const payload = { name: form.value.name, scope: scopeEntry.id, parent: form.value.parent || null }
  try {
    if (isEdit.value) {
      await api.put('rest/service/id/group', payload)
    } else {
      await api.post('rest/service/id/group', payload)
    }
    emit('saved', { name: form.value.name })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (demoMode.value) {
    errorStore.push({ message: t('group.demoDelete'), status: 0 })
    confirmDelete.value = false
    return
  }
  deleting.value = true
  try {
    await api.del(`rest/service/id/group/${props.groupId}`)
    confirmDelete.value = false
    emit('deleted', { name: props.groupId })
  } finally {
    deleting.value = false
  }
}
</script>
