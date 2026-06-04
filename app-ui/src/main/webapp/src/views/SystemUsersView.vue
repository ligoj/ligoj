<!--
  SystemUsersView — 2026 "Vibrant" system-account manager
  (Administration → System users). Ports plugin-ui's SystemUserView logic
  (useDataTable on 'system/user/roles' for server-side fetch / sort / paging /
  search + POST/PUT save + DELETE, roles loaded from rest/system/security/role)
  onto the Vibrant chrome: breadcrumb-chip header with a search box, KPI stat
  cards, VibrantDataTable with a login avatar cell and role chips, a Vibrant
  edit modal (login + roles autocomplete) and a confirm dialog.
-->
<template>
  <div class="susers">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb"><v-icon size="13">mdi-cog-outline</v-icon>{{ t('system.breadcrumb') }}</span><span class="csep">›</span><span class="crumb cur">{{ t('system.user.title') }}</span></nav>
        <h1>{{ t('system.user.title') }}</h1>
        <p class="sub"><b>{{ dt.totalItems.value }}</b> {{ t('system.user.countLabel') }}</p>
      </div>
      <div class="ph-actions">
        <div class="search">
          <v-icon size="17" class="search-ic">mdi-magnify</v-icon>
          <input v-model="dt.search.value" type="text" :placeholder="t('system.user.searchPlaceholder')" @input="onSearch" />
          <button v-if="dt.search.value" class="search-x" @click="clearSearch"><v-icon size="15">mdi-close</v-icon></button>
        </div>
        <button class="btn" @click="openNew"><v-icon size="18">mdi-plus</v-icon>{{ t('system.user.new') }}</button>
      </div>
    </header>

    <div class="stats">
      <div v-for="(s, i) in stats" :key="s.key" class="stat" :style="{ '--c': s.color, 'animation-delay': (i * 50) + 'ms' }">
        <div class="stop">
          <span class="sicon"><v-icon size="22">{{ s.icon }}</v-icon></span>
          <div class="sbody"><div class="snum">{{ s.value }}</div><div class="slabel">{{ s.label }}</div></div>
        </div>
        <div class="sbar"><i :style="{ width: s.pct + '%' }" /></div>
      </div>
    </div>

    <p v-if="dt.error.value" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ dt.error.value }}</p>

    <VibrantDataTable :headers="headers" :items="dt.items.value" :items-length="dt.totalItems.value" :loading="dt.loading.value" item-value="login"
      default-sort="login" :empty-text="t('common.noData')" @update:options="loadData" @row-click="openEdit">
      <template #cell.login="{ item }">
        <div class="avatar-cell">
          <span class="uglyph"><v-icon size="18">mdi-account-circle</v-icon></span>
          <code class="ulogin">{{ item.login }}</code>
        </div>
      </template>
      <template #cell.roles="{ item }">
        <span class="chips">
          <span v-for="r in (item.roles || [])" :key="r.id" class="rchip"><v-icon size="12">mdi-shield-account-outline</v-icon>{{ r.name }}</span>
          <span v-if="!(item.roles || []).length" class="dash">{{ t('system.user.noRoles') }}</span>
        </span>
      </template>
      <template #actions="{ item }">
        <button class="iconbtn" @click.stop="openEdit(item)">
          <v-icon size="18">mdi-pencil-outline</v-icon>
          <v-tooltip activator="parent" :text="t('common.edit')" location="top" />
        </button>
        <button class="iconbtn danger" @click.stop="startDelete(item)">
          <v-icon size="18">mdi-delete-outline</v-icon>
          <v-tooltip activator="parent" :text="t('common.delete')" location="top" />
        </button>
      </template>
    </VibrantDataTable>

    <!-- Create / edit dialog (Vibrant chrome). -->
    <v-dialog v-model="editDialog" max-width="540">
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">mdi-account</v-icon></span>
          <h3>{{ editTarget ? t('system.user.editTitle') : t('system.user.newTitle') }}</h3>
          <button class="x" :aria-label="t('common.cancel')" @click="editDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <v-card-text class="vmodal-body">
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field v-model="editForm.login" prepend-inner-icon="mdi-account" :label="t('system.user.fieldLogin')" :rules="[rules.required]" :disabled="!!editTarget" variant="outlined" class="mb-3" autofocus />
            <v-autocomplete v-model="editForm.roles" :label="t('system.user.fieldRoles')" prepend-inner-icon="mdi-shield-account-outline" :items="allRoles" item-value="id" item-title="name"
              multiple chips closable-chips variant="outlined" :rules="[rules.requiredArray]" :hint="t('system.user.rolesHint')" persistent-hint />
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

    <LigojConfirmDialog v-model="deleteDialog" :title="t('system.user.deleteTitle')" icon="mdi-account" confirm-color="error" :confirm-label="t('common.delete')" :loading="deleting" @confirm="confirmDelete">
      {{ t('system.user.deleteConfirmBefore') }}<strong class="text-error">{{ deleteTarget?.login }}</strong>{{ t('system.user.deleteConfirmAfter') }}
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi, useAppStore, useDataTable, useI18nStore } from '@ligoj/host'
import VibrantDataTable from '@/components/VibrantDataTable.vue'
import LigojConfirmDialog from '@/components/VibrantConfirmDialog.vue'

const api = useApi()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const dt = useDataTable('system/user/roles', { defaultSort: 'login' })
let searchTimeout = null
let lastOptions = {}

const allRoles = ref([])

const rules = {
  required: (v) => !!v || (t('common.required') || 'Required'),
  requiredArray: (v) => (Array.isArray(v) && v.length > 0) || t('system.user.rolesHint'),
}

const headers = computed(() => [
  { key: 'login', label: t('system.user.headerLogin'), sortable: true, icon: 'mdi-account' },
  { key: 'roles', label: t('system.user.headerRoles'), sortable: false, icon: 'mdi-shield-account-outline' },
])

const stats = computed(() => [
  { key: 'total', label: t('system.user.statTotal'), icon: 'mdi-account-key-outline', color: 'rgb(var(--v-theme-secondary))', value: dt.totalItems.value, pct: 100 },
  { key: 'roles', label: t('system.user.statRoles'), icon: 'mdi-shield-account-outline', color: '#8b5cf6', value: allRoles.value.length, pct: 100 },
])

function loadData(options) { lastOptions = options; dt.load(options) }
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => dt.load({ page: 1, itemsPerPage: lastOptions.itemsPerPage || 25, sortBy: lastOptions.sortBy }), 300)
}
function clearSearch() { dt.search.value = ''; onSearch() }

async function loadRoles() {
  try {
    const data = await api.get('rest/system/security/role')
    if (Array.isArray(data)) allRoles.value = data
    else if (Array.isArray(data?.data)) allRoles.value = data.data
  } catch { /* free-text fallback */ }
}

/* create / edit */
const formRef = ref(null)
const editDialog = ref(false)
const editTarget = ref(null)
const editForm = ref({ login: '', roles: [] })
const saving = ref(false)
function openNew() {
  editTarget.value = null
  editForm.value = { login: '', roles: [] }
  editDialog.value = true
}
function openEdit(item) {
  editTarget.value = item
  editForm.value = { login: item.login, roles: (item.roles || []).map((r) => r.id) }
  editDialog.value = true
}
async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    await api[editTarget.value ? 'put' : 'post']('rest/system/user', { login: editForm.value.login, roles: editForm.value.roles })
    editDialog.value = false
    dt.load(lastOptions)
  } finally { saving.value = false }
}

/* delete */
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
function startDelete(item) { deleteTarget.value = item; deleteDialog.value = true }
async function confirmDelete() {
  deleting.value = true
  try {
    await api.del(`rest/system/user/${encodeURIComponent(deleteTarget.value.login)}`)
    deleteDialog.value = false
    dt.load(lastOptions)
  } finally { deleting.value = false }
}

onMounted(() => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('system.breadcrumb') }, { title: t('system.user.title') }], { refresh: () => { loadRoles(); dt.load(lastOptions) } })
  loadRoles()
})
</script>

<style scoped>
.susers {
  --surface: rgb(var(--v-theme-surface));
  --card: rgb(var(--v-theme-surface));
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
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
.crumbs { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.crumb { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font); font-size: 11.5px; font-weight: 700; color: var(--ink-3); background: var(--pill); border-radius: 999px; padding: 3px 10px; }
.crumb.cur { color: var(--accent); background: rgba(var(--v-theme-secondary), .12); }
.csep { color: var(--ink-3); font-size: 12px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.ph-txt .sub b { color: var(--ink-2); font-family: var(--mono); }
.ph-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search { display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; height: 42px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); min-width: 240px; transition: border-color .15s; }
.search:focus-within { border-color: var(--border-2); }
.search-ic { color: var(--ink-3); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-family: var(--font); font-size: 13.5px; font-weight: 500; min-width: 0; }
.search input::placeholder { color: var(--ink-3); }
.search-x { border: 0; background: transparent; cursor: pointer; color: var(--ink-3); display: grid; place-items: center; padding: 2px; border-radius: 6px; }
.search-x:hover { color: var(--ink); background: var(--hover); }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 16px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover { filter: brightness(1.04); }

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
.stat { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--border); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 9%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); opacity: 0; transform: translateY(10px); animation: rise .5s cubic-bezier(.2, .7, .3, 1) forwards; transition: transform .18s cubic-bezier(.2, .7, .3, 1), box-shadow .18s, border-color .18s; }
@keyframes rise { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .stat { animation: none; opacity: 1; transform: none; } }
.stat:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -20px color-mix(in srgb, var(--c) 55%, transparent); border-color: color-mix(in srgb, var(--c) 30%, var(--border)); }
.stop { display: flex; align-items: center; gap: 14px; }
.sicon { width: 46px; height: 46px; border-radius: 13px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.snum { font-family: var(--mono); font-weight: 700; font-size: 26px; line-height: 1; color: var(--ink); }
.slabel { font-size: 12.5px; font-weight: 600; color: var(--ink-3); margin-top: 4px; }
.sbar { height: 6px; border-radius: 4px; background: var(--pill); overflow: hidden; }
.sbar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 55%, white)); transition: width .5s cubic-bezier(.2, .7, .3, 1); }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

.avatar-cell { display: flex; align-items: center; gap: 12px; }
.uglyph { width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; background: var(--pill); color: var(--ink-3); }
.ulogin { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--ink); }
.chips { display: inline-flex; flex-wrap: wrap; gap: 6px; }
.rchip { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font); font-weight: 700; font-size: 11.5px; padding: 3px 10px; border-radius: 999px; color: #8b5cf6; background: rgba(139, 92, 246, .13); }
.dash { color: var(--ink-3); font-size: 13px; }
.iconbtn { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-3); transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--hover); color: var(--ink); }
.iconbtn.danger:hover { background: rgba(var(--v-theme-error), .1); color: rgb(var(--v-theme-error)); }

/* Edit modal (Vibrant). Vars re-declared on .vmodal for the teleported card. */
.vmodal {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  border-radius: 20px !important; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important;
}
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
