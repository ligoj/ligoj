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
  <div class="gmpanel">
    <!-- Add-member bar: server-side autocomplete + Vibrant CTA. -->
    <div class="addbar">
      <v-autocomplete v-model="newMember" v-model:search="searchTerm" :label="t('id.group.addPlaceholder')" :items="searchResults" item-title="label" item-value="id" :loading="searching" no-filter
        clearable variant="outlined" density="comfortable" rounded="lg" hide-details autocomplete="off" class="addsel" prepend-inner-icon="mdi-account-search"
        @update:search="onSearch" @update:menu="onSearchMenu" />
      <button class="btn" :disabled="!newMember || !groupName || adding" @click="addMember">
        <span v-if="adding" class="bspin" aria-hidden="true" /><v-icon v-else size="18">mdi-account-plus</v-icon>{{ t('id.group.add') }}
      </button>
    </div>

    <label class="search">
      <v-icon size="18">mdi-magnify</v-icon>
      <input v-model="dt.search.value" :placeholder="t('common.search')" @input="onMemberSearch" />
    </label>

    <v-alert v-if="dt.error.value" type="warning" variant="tonal" class="mb-4" rounded="lg">
      {{ dt.error.value === 'internal' ? t('user.noProviderMsg') : dt.error.value }}
    </v-alert>

    <VibrantDataTable v-if="!dt.error.value" :headers="headers" :items="dt.items.value" :items-length="dt.totalItems.value" :loading="dt.loading.value"
      item-value="id" default-sort="id" @update:options="loadData">
      <template #cell.id="{ item }">
        <span class="login"><v-icon size="16" class="login-ic">mdi-account-circle</v-icon><span class="mono">{{ item.id }}</span></span>
      </template>
      <template #cell.mails="{ item }">
        <span class="mails">
          <span v-for="m in (item.mails || []).slice(0, 2)" :key="m" class="mailchip"><v-icon size="12">mdi-email-outline</v-icon>{{ m }}</span>
          <span v-if="(item.mails || []).length > 2" class="more">+{{ item.mails.length - 2 }}</span>
          <span v-if="!(item.mails || []).length" class="dash">—</span>
        </span>
      </template>
      <template #cell.groups="{ item }">
        <span class="groups">
          <span v-for="g in (item.groups || []).slice(0, 3)" :key="g.name || g" class="chip">{{ g.name || g }}</span>
          <span v-if="(item.groups || []).length > 3" class="more">+{{ item.groups.length - 3 }}</span>
          <span v-if="!(item.groups || []).length" class="dash">—</span>
        </span>
      </template>
      <template #actions="{ item }">
        <button v-if="canRemove(item)" class="iconbtn danger" :aria-label="t('id.group.removeTitle')" @click.stop="startRemove(item)">
          <v-icon size="18">mdi-account-minus</v-icon>
          <v-tooltip activator="parent" :text="t('id.group.removeTitle')" location="top" />
        </button>
        <v-tooltip v-else-if="isTransitive(item)" :text="t('id.group.transitive')" location="top">
          <template #activator="{ props: tt }">
            <v-icon v-bind="tt" size="18" color="info">mdi-information-outline</v-icon>
          </template>
        </v-tooltip>
      </template>
    </VibrantDataTable>

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
} from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'
import LigojConfirmDialog from './VibrantConfirmDialog.vue'
import VibrantDataTable from './VibrantDataTable.vue'

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
  { label: t('user.login'), key: 'id', sortable: true, width: '170px' },
  { label: t('user.firstName'), key: 'firstName', sortable: true },
  { label: t('user.lastName'), key: 'lastName', sortable: true },
  { label: t('user.company'), key: 'company', sortable: true },
  { label: t('user.emails'), key: 'mails' },
  { label: t('user.groups'), key: 'groups' },
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
.gmpanel {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --surface: rgb(var(--v-theme-surface));
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
}

/* Add-member bar + CTA. */
.addbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
.addsel { min-width: 320px; flex: 1 1 320px; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 11px 17px; border-radius: 12px; cursor: pointer; border: 0; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover:not(:disabled) { filter: brightness(1.04); }
.btn:disabled { opacity: .55; cursor: default; }
.bspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: bspin .7s linear infinite; }
@keyframes bspin { to { transform: rotate(360deg); } }

/* Member search. */
.search { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 360px; padding: 9px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-3); margin-bottom: 14px; transition: border-color .15s, box-shadow .15s; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(var(--v-theme-secondary), .15); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; font-family: var(--font); font-size: 14px; color: var(--ink); }
.search input::placeholder { color: var(--ink-3); }

/* Cells (shared language with UsersView). */
.login { display: inline-flex; align-items: center; gap: 8px; }
.login-ic { color: var(--ink-3); }
.mono { font-family: var(--mono); font-size: 13px; font-weight: 600; }
.mails { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.mailchip { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: rgba(var(--v-theme-on-surface), .72); background: var(--pill); border: 1px solid var(--border); border-radius: 8px; padding: 3px 9px; }
.mailchip :deep(.v-icon) { opacity: .6; }
.groups { display: inline-flex; align-items: center; flex-wrap: nowrap; gap: 5px; overflow: hidden; }
.chip { display: inline-flex; align-items: center; font-size: 12px; font-weight: 700; color: rgba(var(--v-theme-on-surface), .72); background: var(--pill); border: 1px solid var(--border); border-radius: 20px; padding: 3px 11px; white-space: nowrap; }
.more { font-size: 12px; font-weight: 700; color: var(--ink-3); }
.dash { color: var(--ink-3); }

.iconbtn { width: 32px; height: 32px; border-radius: 9px; border: 1px solid transparent; background: transparent; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-3); transition: background .12s, color .12s; }
.iconbtn.danger:hover { background: rgba(var(--v-theme-error), .1); color: rgb(var(--v-theme-error)); }
</style>
