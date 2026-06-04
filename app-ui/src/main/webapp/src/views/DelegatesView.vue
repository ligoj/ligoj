<!--
  DelegatesView — 2026 "Vibrant" Delegations list (plugin-id). Same recipe:
  VibrantDataTable + reused DelegateEditDialog (Vibrant) + VibrantConfirmDialog,
  on the security/delegate endpoint. Columns: receiver, resource, admin, write.
-->
<template>
  <div class="delegates">
    <header class="ph">
      <div class="ph-txt">
        <h1>{{ t('delegate.title') }}</h1>
        <p class="sub">{{ t('delegate.subtitle2026') }}</p>
      </div>
      <div class="ph-actions">
        <button class="btn" @click="openDialog(null)"><v-icon size="18">mdi-plus</v-icon>{{ t('delegate.new') }}</button>
      </div>
    </header>

    <div class="toolbar">
      <label class="search">
        <v-icon size="18">mdi-magnify</v-icon>
        <input v-model="dt.search.value" :placeholder="t('delegate.searchPlaceholder') || t('common.search')" @input="onSearch" />
      </label>
      <span class="tb-sp" />
      <v-slide-x-transition>
        <div v-if="selected.length" class="bulkbar">
          <span class="bulk-count">{{ selected.length }} {{ t('common.selected') }}</span>
          <button class="btn-danger" @click="startBulkDelete"><v-icon size="16">mdi-delete</v-icon>{{ t('common.delete') }}</button>
        </div>
      </v-slide-x-transition>
    </div>

    <v-alert v-if="dt.error.value" type="warning" variant="tonal" class="mb-4" rounded="lg">{{ dt.error.value }}</v-alert>

    <VibrantDataTable v-if="!dt.error.value" :headers="headers" :items="dt.items.value" :items-length="dt.totalItems.value" :loading="dt.loading.value"
      selectable v-model="selected" item-value="id" default-sort="receiver" @update:options="loadData" @row-click="(item) => openDialog(item.id)">
      <template #cell.receiver="{ item }">
        <span class="rcv">
          <v-tooltip :text="t('delegate.type.' + (item.receiverType || '').toLowerCase())" location="top">
            <template #activator="{ props: tt }"><v-icon v-bind="tt" size="16" class="rcv-ic">{{ TYPE_ICONS[item.receiverType?.toUpperCase()] || 'mdi-account' }}</v-icon></template>
          </v-tooltip>
          <span class="rcv-name">{{ item.receiver?.name || item.receiver?.id || item.name || '—' }}</span>
        </span>
      </template>
      <template #cell.name="{ item }">
        <span class="res">
          <v-tooltip :text="t('delegate.type.' + (item.type || '').toLowerCase())" location="top">
            <template #activator="{ props: tt }"><v-icon v-bind="tt" size="16" class="res-ic">{{ TYPE_ICONS[item.type?.toUpperCase()] || 'mdi-shield-key-outline' }}</v-icon></template>
          </v-tooltip>
          <span>{{ item.name || '—' }}</span>
        </span>
      </template>
      <template #cell.canAdmin="{ item }">
        <span class="bdot" :class="{ on: item.canAdmin }" :title="item.canAdmin ? t('delegate.adminGranted') : ''" />
      </template>
      <template #cell.canWrite="{ item }">
        <span class="bdot" :class="{ on: item.canWrite }" :title="item.canWrite ? t('delegate.writeGranted') : ''" />
      </template>
      <template #actions="{ item }">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <button class="iconbtn" v-bind="props" :aria-label="t('common.edit')" @click.stop><v-icon size="18">mdi-cog</v-icon></button>
          </template>
          <div class="popmenu">
            <button @click="openDialog(item.id)"><v-icon size="18">mdi-pencil</v-icon>{{ t('common.edit') }}</button>
            <div class="sep" />
            <button class="danger" @click="startDelete(item)"><v-icon size="18">mdi-delete</v-icon>{{ t('common.delete') }}</button>
          </div>
        </v-menu>
      </template>
    </VibrantDataTable>

    <LigojConfirmDialog v-model="deleteDialog" :title="t('delegate.deleteTitle')" :icon="TYPE_ICONS.DELEGATE" :confirm-label="t('common.delete')" confirm-color="error" :loading="deleting" @confirm="confirmDelete">
      {{ t('delegate.deleteConfirmBefore') }}<strong class="text-error">{{ deleteTarget?.receiver?.name || deleteTarget?.name || deleteTarget?.id }}</strong>{{ t('delegate.deleteConfirmAfter') }}
    </LigojConfirmDialog>
    <LigojConfirmDialog v-model="bulkDeleteDialog" :title="t('common.bulkDeleteTitle')" :icon="TYPE_ICONS.DELEGATE" :confirm-label="t('common.delete')" confirm-color="error" :loading="deleting" @confirm="confirmBulkDelete">
      {{ t('common.bulkDeleteConfirmBefore') }}<strong class="text-error">{{ selected.length }}</strong>{{ t('common.bulkDeleteConfirmAfter') }}
    </LigojConfirmDialog>

    <DelegateEditDialog v-model="editDialog" :delegate-id="editDelegateId" @saved="onDelegateSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDataTable, useApi, useAppStore, useErrorStore, useI18nStore } from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'
import VibrantDataTable from '../components/VibrantDataTable.vue'
import DelegateEditDialog from './DelegateEditDialog2026.vue'
import LigojConfirmDialog from '../components/VibrantConfirmDialog.vue'

const appStore = useAppStore()
const api = useApi()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

const dt = useDataTable('security/delegate', { defaultSort: 'receiver' })
let searchTimeout = null
let lastOptions = { page: 1, itemsPerPage: 25, sortBy: [] }

const selected = ref([])
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const bulkDeleteDialog = ref(false)
const editDialog = ref(false)
const editDelegateId = ref(null)

const headers = computed(() => [
  { label: t('delegate.receiver'), key: 'receiver', sortable: true },
  { label: t('delegate.resource'), key: 'name' },
  { label: t('delegate.admin'), key: 'canAdmin', align: 'center', width: '90px' },
  { label: t('delegate.write'), key: 'canWrite', align: 'center', width: '90px' },
])

function loadData(options) { lastOptions = options; dt.load(options) }
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => dt.load({ page: 1, itemsPerPage: lastOptions.itemsPerPage || 25 }), 300)
}

function openDialog(id = null) { editDelegateId.value = id; editDialog.value = true }
function onDelegateSaved() { dt.load(lastOptions) }

function startDelete(item) { deleteTarget.value = item; deleteDialog.value = true }
async function confirmDelete() {
  deleting.value = true
  await api.del(`rest/security/delegate/${deleteTarget.value.id}`)
  deleting.value = false; deleteDialog.value = false; deleteTarget.value = null
  dt.load(lastOptions)
}
function startBulkDelete() { bulkDeleteDialog.value = true }
async function confirmBulkDelete() {
  deleting.value = true
  for (const id of selected.value) await api.del(`rest/security/delegate/${id}`)
  deleting.value = false; bulkDeleteDialog.value = false; selected.value = []
  dt.load(lastOptions)
}

onMounted(() => {
  appStore.setBreadcrumbs(
    [{ title: t('nav.home'), to: '/' }, { title: t('nav.identity') }, { title: t('delegate.title') }],
    { refresh: () => dt.load(lastOptions) },
  )
})
</script>

<style scoped>
.delegates {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .05);
  --primary: rgb(var(--v-theme-primary));
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; color: var(--ink); }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.ph-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.btn, .btn-danger { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 11px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s; }
.btn { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.btn:hover { filter: brightness(1.04); }
.btn-danger { color: #fff; background: rgb(var(--v-theme-error)); }
.btn-danger:hover { filter: brightness(1.06); }

.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.tb-sp { flex: 1; }
.search { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 520px; padding: 9px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-3); transition: border-color .15s, box-shadow .15s; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(var(--v-theme-secondary), .15); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; font-family: var(--font); font-size: 14px; color: var(--ink); }
.search input::placeholder { color: var(--ink-3); }
.bulkbar { display: flex; align-items: center; gap: 12px; }
.bulk-count { font-weight: 700; font-size: 13px; color: var(--ink-2); }

.rcv, .res { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; }
.rcv-ic, .res-ic { color: var(--ink-3); }
.rcv-name { font-weight: 600; }
/* Status dot: muted when off, vivid green with a glow when on. */
.bdot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: rgba(var(--v-theme-on-surface), .2); transition: background .15s, box-shadow .15s; }
.bdot.on { background: #1d9d63; box-shadow: 0 0 0 3px rgba(29, 157, 99, .18), 0 0 10px 1px rgba(29, 157, 99, .6); }

.iconbtn { width: 32px; height: 32px; border-radius: 9px; border: 1px solid transparent; background: transparent; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-2); transition: background .12s; }
.iconbtn:hover { background: var(--hover); }
.popmenu { min-width: 190px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 12px; box-shadow: 0 16px 44px -14px rgba(0, 0, 0, .45); padding: 6px; }
.popmenu button { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; cursor: pointer; font-family: var(--font); font-size: 13.5px; font-weight: 600; color: rgb(var(--v-theme-on-surface)); padding: 10px 12px; border-radius: 8px; text-align: left; }
.popmenu button:hover { background: rgba(var(--v-theme-on-surface), .06); }
.popmenu button.danger { color: rgb(var(--v-theme-error)); }
.popmenu .sep { height: 1px; background: rgba(var(--v-theme-on-surface), .12); margin: 5px 4px; }
</style>
