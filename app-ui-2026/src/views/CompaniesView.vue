<!--
  CompaniesView — 2026 "Vibrant" Companies/Entities list (plugin-id). Same
  recipe as GroupsView (VibrantDataTable + reused CompanyEditPanel in a
  Vibrant dialog + VibrantConfirmDialog), on service/id/company. No members.
-->
<template>
  <div class="companies">
    <header class="ph">
      <div class="ph-txt">
        <h1>{{ t('company.title') }}</h1>
        <p class="sub">{{ t('company.subtitle2026') }}</p>
      </div>
      <div class="ph-actions">
        <button class="btn" @click="openCreate"><v-icon size="18">mdi-plus</v-icon>{{ t('company.new') }}</button>
      </div>
    </header>

    <div class="toolbar">
      <label class="search">
        <v-icon size="18">mdi-magnify</v-icon>
        <input v-model="dt.search.value" :placeholder="t('company.searchPlaceholder') || t('common.search')" @input="onSearch" />
      </label>
      <span class="tb-sp" />
      <v-slide-x-transition>
        <div v-if="selected.length" class="bulkbar">
          <span class="bulk-count">{{ selected.length }} {{ t('common.selected') }}</span>
          <button class="btn-danger" @click="startBulkDelete"><v-icon size="16">mdi-delete</v-icon>{{ t('common.delete') }}</button>
        </div>
      </v-slide-x-transition>
    </div>

    <v-alert v-if="dt.error.value" type="warning" variant="tonal" class="mb-4" rounded="lg">
      <v-alert-title>{{ t('user.noProvider') }}</v-alert-title>
      {{ dt.error.value === 'internal' ? t('company.noProvider') : dt.error.value }}
    </v-alert>
    <v-alert v-if="dt.demoMode.value" type="info" variant="tonal" density="compact" class="mb-4" rounded="lg">
      {{ t('user.demoMode') }}
    </v-alert>

    <VibrantDataTable v-if="!dt.error.value" :headers="headers" :items="dt.items.value" :items-length="dt.totalItems.value" :loading="dt.loading.value"
      selectable v-model="selected" item-value="name" default-sort="name" @update:options="loadData" @row-click="(item) => openDetails(item.name)">
      <template #cell.name="{ item }">
        <span class="cname"><v-icon size="16" class="cname-ic">mdi-office-building-outline</v-icon><span>{{ item.name }}</span></span>
      </template>
      <template #cell.scope="{ item }">
        <span v-if="item.scope" class="tagdot"><span class="d" :style="{ background: scopeColor(item.scope) }" />{{ item.scope }}</span>
        <span v-else class="dash">—</span>
      </template>
      <template #cell.count="{ item }"><span class="mono">{{ item.count ?? '—' }}</span></template>
      <template #cell.locked="{ item }">
        <v-tooltip v-if="item.locked" :text="t('user.statusLocked')" location="top">
          <template #activator="{ props: tt }"><v-icon v-bind="tt" color="error" size="19">mdi-lock</v-icon></template>
        </v-tooltip>
        <span v-else class="dash">—</span>
      </template>
      <template #actions="{ item }">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <button class="iconbtn" v-bind="props" :aria-label="t('common.view')" @click.stop><v-icon size="18">mdi-cog</v-icon></button>
          </template>
          <div class="popmenu">
            <button @click="openDetails(item.name)"><v-icon size="18">mdi-eye-outline</v-icon>{{ t('common.view') }}</button>
            <div class="sep" />
            <button class="danger" @click="startDelete(item)"><v-icon size="18">mdi-delete</v-icon>{{ t('common.delete') }}</button>
          </div>
        </v-menu>
      </template>
    </VibrantDataTable>

    <v-dialog v-model="editDialog" max-width="600" scrollable>
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">{{ editingId ? 'mdi-eye-outline' : 'mdi-office-building' }}</v-icon></span>
          <h3>{{ editingId ? t('company.detailsTitle') : t('company.new') }} <span v-if="editingId" class="who">{{ editingId }}</span></h3>
          <button class="x" :aria-label="t('common.cancel')" @click="editDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <CompanyEditPanel v-if="editDialog" :key="editingId ?? 'new'" :company-id="editingId" @saved="onEditSaved" @deleted="onEditDeleted" @cancel="editDialog = false" />
      </v-card>
    </v-dialog>

    <LigojConfirmDialog v-model="deleteDialog" :title="t('company.deleteTitle')" :icon="TYPE_ICONS.COMPANY" :confirm-label="t('common.delete')" confirm-color="error" :loading="deleting" @confirm="confirmDelete">
      {{ t('company.deleteConfirmBefore') }}<strong class="text-error">{{ deleteTarget?.name }}</strong>{{ t('company.deleteConfirmAfter') }}
    </LigojConfirmDialog>
    <LigojConfirmDialog v-model="bulkDeleteDialog" :title="t('common.bulkDeleteTitle')" :icon="TYPE_ICONS.COMPANY" :confirm-label="t('common.delete')" confirm-color="error" :loading="deleting" @confirm="confirmBulkDelete">
      {{ t('common.bulkDeleteConfirmBefore') }}<strong class="text-error">{{ selected.length }}</strong>{{ t('common.bulkDeleteConfirmAfter') }}
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDataTable, useApi, useAppStore, useErrorStore, useI18nStore } from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'
import VibrantDataTable from '../components/VibrantDataTable.vue'
import CompanyEditPanel from '../components/CompanyEditPanel.vue'
import LigojConfirmDialog from '../components/VibrantConfirmDialog.vue'

const route = useRoute()
const appStore = useAppStore()
const api = useApi()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

const DEMO_COMPANIES = [
  { name: 'Ligoj', scope: 'Internal', count: 12, locked: false },
  { name: 'AcmeCorp', scope: 'External', count: 5, locked: false },
  { name: 'TechSolutions', scope: 'External', count: 3, locked: false },
]
const dt = useDataTable('service/id/company', { defaultSort: 'name', demoData: DEMO_COMPANIES })
let searchTimeout = null
let lastOptions = { page: 1, itemsPerPage: 25, sortBy: [] }

const selected = ref([])
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const bulkDeleteDialog = ref(false)
const editDialog = ref(false)
const editingId = ref(null)

const headers = computed(() => [
  { title: t('common.name'), label: t('common.name'), key: 'name', sortable: true },
  { label: t('group.scope'), key: 'scope' },
  { label: t('group.members'), key: 'count', align: 'center', width: '110px' },
  { label: t('group.locked'), key: 'locked', align: 'center', width: '90px' },
])

function scopeColor(scope) { return /intern/i.test(scope) ? '#2563eb' : '#e6a019' }

function loadData(options) { lastOptions = options; dt.load(options) }
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => dt.load({ page: 1, itemsPerPage: lastOptions.itemsPerPage || 25 }), 300)
}

function openCreate() { editingId.value = null; editDialog.value = true }
function openDetails(name) { editingId.value = name; editDialog.value = true }
function onEditSaved() { editDialog.value = false; editingId.value = null; dt.load(lastOptions) }
function onEditDeleted() { editDialog.value = false; editingId.value = null; dt.load(lastOptions) }

function startDelete(item) { deleteTarget.value = item; deleteDialog.value = true }
async function confirmDelete() {
  if (dt.demoMode.value) { errorStore.push({ message: t('company.demoDelete'), status: 0 }); deleteDialog.value = false; return }
  deleting.value = true
  await api.del(`rest/service/id/company/${deleteTarget.value.name}`)
  deleting.value = false; deleteDialog.value = false; deleteTarget.value = null
  dt.load(lastOptions)
}
function startBulkDelete() { bulkDeleteDialog.value = true }
async function confirmBulkDelete() {
  if (dt.demoMode.value) { errorStore.push({ message: t('company.demoDelete'), status: 0 }); bulkDeleteDialog.value = false; return }
  deleting.value = true
  for (const name of selected.value) await api.del(`rest/service/id/company/${name}`)
  deleting.value = false; bulkDeleteDialog.value = false; selected.value = []
  dt.load(lastOptions)
}

onMounted(() => {
  appStore.setBreadcrumbs(
    [{ title: t('nav.home'), to: '/' }, { title: t('nav.identity') }, { title: t('company.title') }],
    { refresh: () => dt.load(lastOptions) },
  )
  const id = route.params?.id
  if (id === 'new' || route.path?.endsWith('/company/new')) openCreate()
  else if (id) openDetails(String(id))
})
</script>

<style scoped>
.companies {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .05);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --primary: rgb(var(--v-theme-primary));
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
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

.cname { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
.cname-ic { color: var(--ink-3); }
.mono { font-family: var(--mono); font-size: 13px; font-weight: 600; }
.tagdot { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; }
.tagdot .d { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dash { color: var(--ink-3); }

.iconbtn { width: 32px; height: 32px; border-radius: 9px; border: 1px solid transparent; background: transparent; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-2); transition: background .12s; }
.iconbtn:hover { background: var(--hover); }
.popmenu { min-width: 200px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 12px; box-shadow: 0 16px 44px -14px rgba(0, 0, 0, .45); padding: 6px; }
.popmenu button { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; cursor: pointer; font-family: var(--font); font-size: 13.5px; font-weight: 600; color: rgb(var(--v-theme-on-surface)); padding: 10px 12px; border-radius: 8px; text-align: left; }
.popmenu button:hover { background: rgba(var(--v-theme-on-surface), .06); }
.popmenu button.danger { color: rgb(var(--v-theme-error)); }
.popmenu .sep { height: 1px; background: rgba(var(--v-theme-on-surface), .12); margin: 5px 4px; }

.vmodal { border-radius: 20px !important; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important; }
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 20px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; }
.vmodal-head h3 .who { color: #ff5a52; }
.vmodal-head .x { width: 36px; height: 36px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); }
.vmodal-head .x:hover { background: var(--hover); color: var(--ink); }
</style>
