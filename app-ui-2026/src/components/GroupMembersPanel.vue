<template>
  <!-- Member-management panel — group-name-driven, no subscription
       dependency. Used by both:
         - `GroupMembersDialog`   (header-mounted, opened from the
           GroupListView action column or the host's subscription-row
           buttons via `useGroupMembersDialog().openFor(group)`).
         - `GroupMembersView`     (routed `/id/subscription/:id` view —
           bootstraps the subscription then mounts this panel).
       Lifting the body out of the routed view is the deduplication
       that made the dialog cheap: backend API contract is "group name
       → members list", no project / subscription context required. -->
  <div>
    <!-- Add-member toolbar. Server-side autocomplete; submit (PUT)
         reloads the table. -->
    <v-card variant="tonal" class="mb-4">
      <v-card-text class="d-flex flex-wrap align-center ga-2">
        <v-autocomplete v-model="newMember" v-model:search="searchTerm" :label="t('id.group.addPlaceholder')" :items="searchResults" item-title="label" item-value="id" :loading="searching" no-filter
          clearable variant="outlined" density="compact" hide-details autocomplete="off" style="min-width: 320px; flex: 1 1 320px" @update:search="onSearch" @update:menu="onSearchMenu" />
        <v-btn color="primary" prepend-icon="mdi-account-plus" :disabled="!newMember || !groupName" :loading="adding" @click="addMember">
          {{ t('id.group.add') }}
        </v-btn>
      </v-card-text>
    </v-card>

    <v-text-field v-model="dt.search.value" prepend-inner-icon="mdi-magnify" :label="t('common.search')" variant="outlined" density="compact" hide-details class="search-field mb-4"
      @update:model-value="onMemberSearch" />

    <v-alert v-if="dt.error.value" type="warning" variant="tonal" class="mb-4">
      {{ dt.error.value === 'internal' ? t('user.noProviderMsg') : dt.error.value }}
    </v-alert>

    <v-skeleton-loader v-if="dt.loading.value && dt.items.value.length === 0" type="table-heading, table-row@5" class="mb-4" />

    <LigojDataTableServer v-if="!dt.error.value" v-show="dt.items.value.length > 0 || !dt.loading.value" filename="members.csv" :fetch-all="dt.loadAll" v-model:items-per-page="itemsPerPage"
      :headers="headers" :items="dt.items.value" :items-length="dt.totalItems.value" :loading="dt.loading.value" item-value="id" hover @update:options="loadData">
      <!-- Email chips, same chrome as UserListView (chantier D4 style):
           up to two as tonal chips, the rest collapse into a "+N" hint
           so the column stays bounded even when an LDAP user carries
           five aliases. -->
      <template #item.id="{ item }">
        <div class="d-flex align-center ga-2">
          <v-icon size="small" color="medium-emphasis">mdi-account-circle</v-icon>
          <code>{{ item.id }}</code>
        </div>
      </template>
      <template #header.id="{ column }"><span class="d-inline-flex align-center"><v-icon size="small" class="mr-1">mdi-account</v-icon>{{ column.title }}<v-tooltip activator="parent" location="top" :text="column.title" /></span></template>
      <template #header.company="{ column }"><span class="d-inline-flex align-center"><v-icon size="small" class="mr-1">mdi-domain</v-icon>{{ column.title }}<v-tooltip activator="parent" location="top" :text="column.title" /></span></template>
      <template #header.mails="{ column }"><span class="d-inline-flex align-center"><v-icon size="small" class="mr-1">mdi-email-outline</v-icon>{{ column.title }}<v-tooltip activator="parent" location="top" :text="column.title" /></span></template>
      <template #header.groups="{ column }"><span class="d-inline-flex align-center"><v-icon size="small" class="mr-1">mdi-account-group</v-icon>{{ column.title }}<v-tooltip activator="parent" location="top" :text="column.title" /></span></template>
      <template #item.mails="{ item }">
        <div class="mails-cell">
          <v-chip v-for="m in (item.mails || []).slice(0, 2)" :key="m" size="small" variant="tonal" class="mr-1">{{ m }}</v-chip>
          <span v-if="(item.mails || []).length > 2" class="text-caption text-medium-emphasis">
            +{{ item.mails.length - 2 }}
          </span>
        </div>
      </template>
      <template #item.groups="{ item }">
        <div class="groups-cell">
          <v-chip v-for="g in (item.groups || []).slice(0, 3)" :key="g.name || g" size="small" class="mr-1">
            {{ g.name || g }}
          </v-chip>
          <span v-if="(item.groups || []).length > 3" class="text-caption text-medium-emphasis">
            +{{ item.groups.length - 3 }}
          </span>
        </div>
      </template>
      <template #item.actions="{ item }">
        <v-btn v-if="canRemove(item)" icon size="small" variant="text" color="error" :title="t('id.group.removeTitle')" @click.stop="startRemove(item)">
          <v-icon size="small">mdi-account-minus</v-icon>
          <v-tooltip activator="parent" :text="t('id.group.removeTitle')" location="top" />
        </v-btn>
        <v-tooltip v-else-if="isTransitive(item)" :text="t('id.group.transitive')" location="top">
          <template #activator="{ props: tt }">
            <v-icon v-bind="tt" size="small" color="info">mdi-information-outline</v-icon>
          </template>
        </v-tooltip>
      </template>
    </LigojDataTableServer>

    <!-- Confirm dialog. Vuetify teleports it to <body>, so being
         nested inside this panel — which itself can be inside a
         <v-dialog> — doesn't cause z-index issues. -->
    <LigojConfirmDialog v-model="removeDialog" :title="t('id.group.removeTitle')" :icon="TYPE_ICONS.USER" :confirm-label="t('common.remove')" confirm-color="error" :loading="removing" @confirm="confirmRemove">
      {{ t('id.group.removeConfirmBefore') }}<strong class="text-error">{{ removeTarget?.id }}</strong>{{ t('id.group.removeConfirmAfter', { group: groupName }) }}
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  useApi,
  useDataTable,
  useErrorStore,
  useI18nStore,
  LigojDataTableServer,
} from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'
import LigojConfirmDialog from './VibrantConfirmDialog.vue'

const props = defineProps({
  /**
   * The LDAP group name to manage. Drives every API call:
   *   - GET    rest/service/id/user?group=<name>     (members table)
   *   - PUT    rest/service/id/user/<u>/group/<name> (add)
   *   - DELETE rest/service/id/user/<u>/group/<name> (remove)
   *
   * Reactive: when this changes the panel reloads. (In the dialog
   * we additionally key the whole panel so internal state resets.)
   */
  groupName: { type: String, required: true },
})

/**
 * `changed` fires after every successful add or remove. The dialog
 * wrapper tracks this to flip a `dirty` flag and invokes the caller's
 * `onChanged` callback when the dialog later closes — letting the
 * GroupListView refresh its member-count column, the host's
 * subscription rows refresh their feature chips, etc., without
 * needing to re-fetch on every individual edit.
 */
const emit = defineEmits(['changed'])

const api = useApi()
const errorStore = useErrorStore()
const { t } = useI18nStore()

const groupName = computed(() => props.groupName)

const itemsPerPage = ref(25)
let lastOptions = {}
let searchTimer = null

// `extraParams` is a function (not a one-shot object) so `groupName`
// stays live: every load() picks up the current group, which matters
// in the routed view where the same panel instance can see groupName
// change. The dialog mounts a fresh panel per group (via :key) so the
// reactive aspect doesn't matter there, but the function form costs
// nothing.
const dt = useDataTable('service/id/user', {
  defaultSort: 'id',
  extraParams: () => ({ group: groupName.value }),
})

const headers = computed(() => [
  { title: t('user.login'), key: 'id', sortable: true, width: '160px' },
  { title: t('user.firstName'), key: 'firstName', sortable: true },
  { title: t('user.lastName'), key: 'lastName', sortable: true },
  { title: t('user.company'), key: 'company', sortable: true },
  { title: t('user.emails'), key: 'mails', sortable: false },
  { title: t('user.groups'), key: 'groups', sortable: false },
  { title: '', key: 'actions', sortable: false, width: '60px', align: 'end' },
])

function loadData(options) {
  lastOptions = options
  // `extraParams` injects `?group=...` so we don't need to thread it
  // through here. Previously this passed `params: { group }` which
  // useDataTable silently ignored — that's how the URL ended up
  // missing the group filter.
  dt.load(options)
}

function onMemberSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(
    () => dt.load({ page: 1, itemsPerPage: itemsPerPage.value }),
    300,
  )
}

/* ---- Add member: autocomplete ----------------------------------- */

const newMember = ref(null)
const searchTerm = ref('')
const searchResults = ref([])
const searching = ref(false)
let userSearchTimer = null

async function fetchUsers(q) {
  const query = (q || '').trim()
  const qp = query ? `q=${encodeURIComponent(query)}&` : ''
  const data = await api.get(`rest/service/id/user?${qp}rows=20`)
  const rows = Array.isArray(data) ? data : (data?.data || [])
  return rows.map((r) => ({
    id: r.id,
    label: [r.id, [r.firstName, r.lastName].filter(Boolean).join(' ')].filter(Boolean).join(' — '),
  }))
}

async function loadUserSuggestions() {
  searching.value = true
  try { searchResults.value = await fetchUsers(searchTerm.value) }
  finally { searching.value = false }
}

function onSearch(q) {
  // Ignore the echo Vuetify emits after a pick mirrors the label into
  // the search input.
  if (searchResults.value.some((i) => i.label === q)) return
  clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(loadUserSuggestions, 250)
}

function onSearchMenu(open) {
  if (open && searchResults.value.length === 0) loadUserSuggestions()
}

const adding = ref(false)
async function addMember() {
  if (!newMember.value || !groupName.value) return
  adding.value = true
  try {
    const ok = await api.put(
      `rest/service/id/user/${encodeURIComponent(newMember.value)}/group/${encodeURIComponent(groupName.value)}`,
    )
    if (ok !== false) {
      errorStore.success(t('id.group.addedToast', { user: newMember.value, group: groupName.value }))
      emit('changed', { action: 'add', user: newMember.value, group: groupName.value })
      newMember.value = null
      searchTerm.value = ''
      dt.load(lastOptions)
    }
  } finally {
    adding.value = false
  }
}

/* ---- Remove member --------------------------------------------- */

const removeDialog = ref(false)
const removeTarget = ref(null)
const removing = ref(false)

function canRemove(item) {
  if (!item?.canWriteGroups) return false
  return (item.groups || []).some(
    (g) => (g.name || g)?.toLowerCase?.() === groupName.value.toLowerCase(),
  )
}

function isTransitive(item) {
  return !!item?.canWriteGroups && !canRemove(item)
}

function startRemove(item) {
  removeTarget.value = item
  removeDialog.value = true
}

async function confirmRemove() {
  if (!removeTarget.value) return
  removing.value = true
  try {
    await api.del(
      `rest/service/id/user/${encodeURIComponent(removeTarget.value.id)}/group/${encodeURIComponent(groupName.value)}`,
    )
    errorStore.success(t('id.group.removedToast', { user: removeTarget.value.id, group: groupName.value }))
    emit('changed', { action: 'remove', user: removeTarget.value.id, group: groupName.value })
    removeDialog.value = false
    removeTarget.value = null
    dt.load(lastOptions)
  } finally {
    removing.value = false
  }
}

/* ---- Bootstrap ------------------------------------------------- */
//
// No initial dt.load() here — the LigojDataTableServer fires
// `@update:options` automatically on first mount, which calls
// `loadData` and runs the first fetch. Calling dt.load() in
// onMounted on top of that produced the double GET the user
// reported. The watcher below still covers the routed-view case
// where the same panel instance sees `groupName` change without a
// fresh mount.

watch(() => groupName.value, (g) => {
  if (g) dt.load(lastOptions)
})
</script>

<style scoped>
.search-field {
  max-width: 320px;
}

/* Same look as UserListView's mails column — soft-wrap on long lists
 * because email addresses can be long; the 2-chip cap + "+N" hint
 * keeps the visual footprint bounded. */
.mails-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.groups-cell {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
