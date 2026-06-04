<!--
  ScopesView — 2026 "Vibrant" Container scopes (plugin-id ContainerScopeView).
  Tabs (group / company), small client-side dataset fed to VibrantDataTable,
  inline Vibrant create/edit dialog + VibrantConfirmDialog. Endpoint:
  rest/service/id/container-scope/{group|company}.
-->
<template>
  <div class="scopes">
    <header class="ph">
      <div class="ph-txt">
        <h1>{{ t('containerScope.title') }}</h1>
        <p class="sub">{{ t('containerScope.subtitle2026') }}</p>
      </div>
      <div class="ph-actions">
        <button class="btn" @click="openNew"><v-icon size="18">mdi-plus</v-icon>{{ t('containerScope.new') }}</button>
      </div>
    </header>

    <div class="toolbar">
      <div class="seg">
        <button :class="{ on: activeTab === 'group' }" @click="activeTab = 'group'"><v-icon size="16">mdi-account-group</v-icon>{{ t('nav.groups') }}</button>
        <button :class="{ on: activeTab === 'company' }" @click="activeTab = 'company'"><v-icon size="16">mdi-domain</v-icon>{{ t('nav.companies') }}</button>
      </div>
      <label class="search">
        <v-icon size="18">mdi-magnify</v-icon>
        <input v-model="search" :placeholder="t('common.search')" />
      </label>
    </div>

    <v-alert v-if="error" type="warning" variant="tonal" class="mb-4" rounded="lg">{{ t('containerScope.noProvider') }}</v-alert>
    <v-alert v-if="demoMode" type="info" variant="tonal" density="compact" class="mb-4" rounded="lg">{{ t('containerScope.demoMode') }}</v-alert>

    <VibrantDataTable v-if="!error" :headers="headers" :items="filteredItems" :items-length="filteredItems.length" :loading="loading"
      item-value="id" @row-click="openEdit">
      <template #cell.name="{ item }">
        <span class="sname"><v-icon size="16" class="sname-ic">mdi-file-tree-outline</v-icon><span>{{ item.name }}</span></span>
      </template>
      <template #cell.dn="{ item }"><code class="dn">{{ item.dn || '—' }}</code></template>
      <template #cell.locked="{ item }">
        <v-tooltip v-if="item.locked" :text="t('user.statusLocked')" location="top">
          <template #activator="{ props: tt }"><v-icon v-bind="tt" color="warning" size="19">mdi-lock</v-icon></template>
        </v-tooltip>
        <span v-else class="dash">—</span>
      </template>
      <template #actions="{ item }">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <button class="iconbtn" v-bind="props" :aria-label="t('common.edit')" @click.stop><v-icon size="18">mdi-cog</v-icon></button>
          </template>
          <div class="popmenu">
            <button @click="openEdit(item)"><v-icon size="18">mdi-pencil</v-icon>{{ t('common.edit') }}</button>
            <div class="sep" />
            <button class="danger" :disabled="item.locked" @click="!item.locked && startDelete(item)"><v-icon size="18">mdi-delete</v-icon>{{ t('common.delete') }}</button>
          </div>
        </v-menu>
      </template>
    </VibrantDataTable>

    <!-- Create / edit dialog (Vibrant chrome). -->
    <v-dialog v-model="editDialog" max-width="520">
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">{{ TYPE_ICONS.SCOPE }}</v-icon></span>
          <h3>{{ editTarget?.id ? t('containerScope.edit') : t('containerScope.new') }}</h3>
          <button class="x" :aria-label="t('common.cancel')" @click="editDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <v-card-text class="vmodal-body">
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field v-model="editForm.name" prepend-inner-icon="mdi-form-textbox" :label="t('common.name')" :rules="[rules.required]" variant="outlined" class="mb-2" autofocus />
            <v-text-field v-if="editTarget?.id" v-model="editForm.dn" prepend-inner-icon="mdi-file-tree-outline" :label="t('containerScope.dn')" variant="outlined" disabled />
          </v-form>
        </v-card-text>
        <div class="vmodal-foot">
          <span class="foot-sp" />
          <button class="mbtn ghost" @click="editDialog = false">{{ t('common.cancel') }}</button>
          <button class="mbtn primary" :disabled="saving" @click="save">
            <span v-if="saving" class="mspin" aria-hidden="true" /><v-icon v-else size="18">mdi-content-save</v-icon>{{ t('common.save') }}
          </button>
        </div>
      </v-card>
    </v-dialog>

    <LigojConfirmDialog v-model="deleteDialog" :title="t('containerScope.deleteTitle')" :icon="TYPE_ICONS.SCOPE" :confirm-label="t('common.delete')" confirm-color="error" :loading="deleting" @confirm="confirmDelete">
      {{ t('containerScope.deleteConfirmBefore') }}<strong class="text-error">{{ deleteTarget?.name }}</strong>{{ t('containerScope.deleteConfirmAfter') }}
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi, useAppStore, useErrorStore, useI18nStore } from '@ligoj/host'
import { TYPE_ICONS } from '../composables/delegateTypes.js'
import VibrantDataTable from '../components/VibrantDataTable.vue'
import LigojConfirmDialog from '../components/VibrantConfirmDialog.vue'

const api = useApi()
const appStore = useAppStore()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

const activeTab = ref('group')

const DEMO_GROUP_SCOPES = [
  { id: 1, name: 'Department', dn: 'ou=Department,dc=demo,dc=com', locked: false },
  { id: 2, name: 'Team', dn: 'ou=Team,dc=demo,dc=com', locked: false },
  { id: 3, name: 'Project', dn: 'ou=Project,dc=demo,dc=com', locked: true },
]
const DEMO_COMPANY_SCOPES = [
  { id: 1, name: 'Organization', dn: 'ou=Organization,dc=demo,dc=com', locked: false },
  { id: 2, name: 'Business Unit', dn: 'ou=BusinessUnit,dc=demo,dc=com', locked: true },
]

const items = ref([])
const loading = ref(false)
const error = ref(null)
const demoMode = ref(false)
const search = ref('')

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((s) => (s.name || '').toLowerCase().includes(q) || (s.dn || '').toLowerCase().includes(q))
})

const headers = computed(() => [
  { label: t('common.name'), key: 'name' },
  { label: t('containerScope.dn'), key: 'dn' },
  { label: t('common.status'), key: 'locked', align: 'center', width: '90px' },
])

const formRef = ref(null)
const editDialog = ref(false)
const editTarget = ref(null)
const editForm = ref({ name: '', dn: '' })
const saving = ref(false)
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const rules = { required: (v) => !!v || t('common.required') }

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const data = await api.get(`rest/service/id/container-scope/${activeTab.value}`)
    if (data && !data.code) {
      items.value = Array.isArray(data) ? data : (data.data || [])
      demoMode.value = false
    } else {
      demoMode.value = true
      errorStore.clear()
      items.value = activeTab.value === 'group' ? DEMO_GROUP_SCOPES : DEMO_COMPANY_SCOPES
    }
  } catch {
    demoMode.value = true
    errorStore.clear()
    items.value = activeTab.value === 'group' ? DEMO_GROUP_SCOPES : DEMO_COMPANY_SCOPES
  }
  loading.value = false
}

watch(activeTab, () => { search.value = ''; loadData() })

function openNew() { editTarget.value = null; editForm.value = { name: '', dn: '' }; editDialog.value = true }
function openEdit(item) { editTarget.value = item; editForm.value = { name: item.name, dn: item.dn || '' }; editDialog.value = true }
function startDelete(item) { deleteTarget.value = item; deleteDialog.value = true }

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  if (demoMode.value) { errorStore.push({ message: t('containerScope.demoSave'), status: 0 }); editDialog.value = false; return }
  saving.value = true
  const payload = { name: editForm.value.name }
  if (editTarget.value?.id) {
    await api.put(`rest/service/id/container-scope/${activeTab.value}`, { id: editTarget.value.id, ...payload })
  } else {
    await api.post(`rest/service/id/container-scope/${activeTab.value}`, payload)
  }
  saving.value = false
  editDialog.value = false
  loadData()
}

async function confirmDelete() {
  if (demoMode.value) { errorStore.push({ message: t('containerScope.demoDelete'), status: 0 }); deleteDialog.value = false; return }
  deleting.value = true
  await api.del(`rest/service/id/container-scope/${activeTab.value}/${deleteTarget.value.id}`)
  deleting.value = false
  deleteDialog.value = false
  loadData()
}

onMounted(() => {
  appStore.setBreadcrumbs(
    [{ title: t('nav.home'), to: '/' }, { title: t('nav.identity') }, { title: t('containerScope.title') }],
    { refresh: loadData },
  )
  loadData()
})
</script>

<style scoped>
.scopes {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; color: var(--ink); }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 11px 17px; border-radius: 12px; cursor: pointer; border: 0; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover { filter: brightness(1.04); }

.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
/* Segmented control (tabs). */
.seg { display: inline-flex; gap: 2px; padding: 3px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
.seg button { display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; padding: 8px 15px; border-radius: 9px; cursor: pointer; font-family: var(--font); font-weight: 700; font-size: 13px; color: var(--ink-3); transition: background .15s, color .15s; }
.seg button:hover { color: var(--ink); }
.seg button.on { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); }
.search { display: flex; align-items: center; gap: 8px; flex: 1; max-width: 420px; padding: 9px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-3); transition: border-color .15s, box-shadow .15s; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(var(--v-theme-secondary), .15); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; font-family: var(--font); font-size: 14px; color: var(--ink); }
.search input::placeholder { color: var(--ink-3); }

.sname { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
.sname-ic { color: var(--ink-3); }
.dn { font-family: var(--mono); font-size: 12.5px; color: var(--ink-2); }
.dash { color: var(--ink-3); }

.iconbtn { width: 32px; height: 32px; border-radius: 9px; border: 1px solid transparent; background: transparent; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-2); transition: background .12s; }
.iconbtn:hover { background: var(--hover); }
.popmenu { min-width: 190px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 12px; box-shadow: 0 16px 44px -14px rgba(0, 0, 0, .45); padding: 6px; }
.popmenu button { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; cursor: pointer; font-family: var(--font); font-size: 13.5px; font-weight: 600; color: rgb(var(--v-theme-on-surface)); padding: 10px 12px; border-radius: 8px; text-align: left; }
.popmenu button:hover { background: rgba(var(--v-theme-on-surface), .06); }
.popmenu button:disabled { opacity: .4; cursor: not-allowed; }
.popmenu button.danger { color: rgb(var(--v-theme-error)); }
.popmenu .sep { height: 1px; background: rgba(var(--v-theme-on-surface), .12); margin: 5px 4px; }

.vmodal { border-radius: 20px !important; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important; }
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 20px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; }
.vmodal-head .x { width: 36px; height: 36px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); }
.vmodal-head .x:hover { background: var(--hover); color: var(--ink); }
.vmodal-body { padding: 14px 24px 4px !important; }
.vmodal :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.vmodal :deep(.v-field__prepend-inner .v-icon) { opacity: .55; }
.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 12px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn.ghost:hover { background: var(--hover); border-color: var(--border-2); }
.mbtn:disabled { opacity: .6; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: sspin .7s linear infinite; }
@keyframes sspin { to { transform: rotate(360deg); } }
</style>
