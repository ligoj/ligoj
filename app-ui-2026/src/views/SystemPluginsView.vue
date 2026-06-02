<!--
  SystemPluginsView — 2026 "Vibrant" plugin manager. Ports plugin-ui's
  SystemPluginView logic (rest/system/plugin: list / search / install /
  upgrade / delete / check-versions / restart) onto the Vibrant chrome:
  .ph header + warm CTA, VibrantDataTable, a .vmodal install dialog and the
  VibrantConfirmDialog for the destructive/restart actions. Mockup ref:
  design/ligoj-2026-prototype.html → viewPlugins.
-->
<template>
  <div class="plugins">
    <header class="ph">
      <div class="ph-txt">
        <h1>{{ t('system.plugin.title') }}</h1>
        <p class="sub"><b>{{ rows.length }}</b> {{ t('system.plugin.countLabel') }}</p>
      </div>
      <div class="ph-actions">
        <label class="repo">
          <v-icon size="16">mdi-source-repository</v-icon>
          <select v-model="repository" @change="load">
            <option v-for="r in REPOSITORIES" :key="r.id" :value="r.id">{{ r.label }}</option>
          </select>
        </label>
        <button class="btn ghost" :disabled="checking" @click="askCheckVersions"><v-icon size="18">mdi-magnify-plus-outline</v-icon>{{ t('system.plugin.checkVersions') }}</button>
        <button class="btn ghost-danger" :disabled="restarting" @click="askRestart"><v-icon size="18">mdi-restart</v-icon>{{ t('system.plugin.restart') }}</button>
        <button class="btn" @click="openInstall"><v-icon size="18">mdi-plus</v-icon>{{ t('system.plugin.install') }}</button>
      </div>
    </header>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

    <VibrantDataTable :headers="headers" :items="rows" :items-length="rows.length" :loading="loading" item-value="id" default-sort="name" :empty-text="t('common.noData')">
      <template #cell.type="{ item }">
        <span class="tglyph" :class="item.type" :title="item.type"><v-icon size="17">{{ typeIcon(item.type) }}</v-icon></span>
      </template>
      <template #cell.name="{ item }">
        <span class="pname">{{ item.name || '—' }}</span>
      </template>
      <template #cell.id="{ item }"><code class="mono">{{ item.artifact }}</code></template>
      <template #cell.vendor="{ item }"><span class="muted">{{ item.vendor || '—' }}</span></template>
      <template #cell.version="{ item }">
        <span class="mono ver">{{ item.version || '—' }}</span>
        <span v-if="item.latestLocalVersion" class="vchip local" :title="t('system.plugin.cancelLocal')" @click.stop="cancelLocal(item)">{{ item.latestLocalVersion }}<v-icon size="13">mdi-close</v-icon></span>
        <span v-if="item.newVersion && item.newVersion !== item.latestLocalVersion" class="vchip up" :title="t('system.plugin.upgradeAvailable')" @click.stop="installOne(item.artifact)"><v-icon size="13">mdi-arrow-up</v-icon>{{ item.newVersion }}</span>
      </template>
      <template #cell.nodes="{ item }"><span v-if="item.type !== 'feature'" class="num">{{ item.nodes ?? 0 }}</span><span v-else class="muted">—</span></template>
      <template #cell.subscriptions="{ item }"><span v-if="item.type !== 'feature'" class="num">{{ item.subscriptions ?? 0 }}</span><span v-else class="muted">—</span></template>
      <template #actions="{ item }">
        <v-icon v-if="item.deleted" size="18" color="warning" :title="t('system.plugin.deletionScheduled')">mdi-cancel</v-icon>
        <button v-else class="iconbtn danger" :title="t('system.plugin.delete')" @click.stop="askRemove(item.artifact)"><v-icon size="18">mdi-delete-outline</v-icon></button>
      </template>
    </VibrantDataTable>

    <!-- Install dialog (.vmodal) -->
    <v-dialog v-model="installDialog" max-width="640" scrollable>
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">mdi-puzzle-plus-outline</v-icon></span>
          <h3>{{ t('system.plugin.installTitle') }}</h3>
          <button class="x" @click="installDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <v-card-text class="vmodal-body">
          <v-autocomplete v-model="installSelection" v-model:search="installSearch" :items="searchResults" item-value="artifact" :label="t('system.plugin.searchArtifacts')"
            :hint="t('system.plugin.searchHint', { repository })" persistent-hint multiple chips closable-chips clearable variant="outlined" :loading="searching" no-filter return-object autofocus
            prepend-inner-icon="mdi-puzzle-plus-outline">
            <template #item="{ props: ip, item }">
              <v-list-item v-bind="ip" :title="item.raw.artifact" :subtitle="item.raw.version" />
            </template>
            <template #no-data>
              <v-list-item :title="installSearch ? t('system.plugin.searchNoMatch') : t('system.plugin.searchPrompt')" />
            </template>
          </v-autocomplete>
          <v-checkbox v-model="installJavadoc" :label="t('system.plugin.installJavadoc')" density="comfortable" hide-details class="mt-1" />
          <div v-if="installing" class="prog"><div class="bar"><i :style="{ width: (installProgress.total ? Math.round(installProgress.current / installProgress.total * 100) : 0) + '%' }" /></div>
            <p>{{ t('system.plugin.installProgress', { current: installProgress.current, total: installProgress.total, label: installProgress.label }) }}</p></div>
        </v-card-text>
        <div class="vmodal-foot">
          <span class="foot-sp" />
          <button class="mbtn ghost" :disabled="installing" @click="installDialog = false">{{ t('common.cancel') }}</button>
          <button class="mbtn primary" :disabled="installing || !installSelection.length" @click="doInstall">
            <span v-if="installing" class="mspin" /><v-icon v-else size="18">mdi-download</v-icon>{{ t('system.plugin.installAction', { count: installSelection.length || '' }) }}
          </button>
        </div>
      </v-card>
    </v-dialog>

    <LigojConfirmDialog v-model="confirm.open" :title="confirm.title" :icon="confirm.icon" :icon-color="confirm.color" :message="confirm.text" :confirm-label="confirm.label" :confirm-color="confirm.color" :loading="confirm.busy" @confirm="runConfirm" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useApi, useAppStore, useI18nStore } from '@ligoj/host'
import VibrantDataTable from '@2026/components/VibrantDataTable.vue'
import LigojConfirmDialog from '@2026/components/VibrantConfirmDialog.vue'

const api = useApi()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const REPOSITORIES = computed(() => [
  { id: 'central', label: t('system.plugin.repoCentral') },
  { id: 'nexus', label: t('system.plugin.repoNexus') },
])
const repository = ref('central')
const items = ref([])
const loading = ref(false)
const error = ref(null)
const checking = ref(false)
const restarting = ref(false)

const headers = computed(() => [
  { key: 'type', title: '', sortable: false, width: '44px', align: 'center' },
  { key: 'name', title: t('system.plugin.headerName'), sortable: true, icon: 'mdi-puzzle-outline' },
  { key: 'id', title: t('system.plugin.headerArtifact'), sortable: true, icon: 'mdi-identifier' },
  { key: 'vendor', title: t('system.plugin.headerVendor'), sortable: true, icon: 'mdi-domain' },
  { key: 'version', title: t('system.plugin.headerVersion'), sortable: false, icon: 'mdi-tag-outline' },
  { key: 'nodes', title: t('system.plugin.headerNodes'), sortable: true, align: 'center', icon: 'mdi-server' },
  { key: 'subscriptions', title: t('system.plugin.headerSubscriptions'), sortable: true, align: 'center', icon: 'mdi-link-variant' },
])

/* Flatten the backend rows (item.plugin.*) into table-friendly rows. */
/* The backend often leaves `name` blank — derive a readable label from the
   artifact (plugin-id-ldap → "Id Ldap") so the column never shows just "—". */
function prettyName(artifact, name) {
  if (name) return name
  return String(artifact || '').replace(/^plugin-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
const rows = computed(() => items.value.map((it) => ({
  id: it.plugin?.artifact || it.plugin?.id,
  artifact: it.plugin?.artifact || it.plugin?.id || '',
  type: (it.plugin?.type || '').toLowerCase(),
  name: prettyName(it.plugin?.artifact || it.plugin?.id, it.plugin?.name),
  vendor: it.plugin?.vendor || '',
  version: it.plugin?.version || '',
  latestLocalVersion: it.latestLocalVersion,
  newVersion: it.newVersion,
  nodes: it.nodes,
  subscriptions: it.subscriptions,
  deleted: it.deleted,
})))

function typeIcon(type) {
  if (type === 'feature') return 'mdi-wrench-outline'
  if (type === 'service') return 'mdi-puzzle-outline'
  if (type === 'tool') return 'mdi-hammer-wrench'
  return 'mdi-puzzle-outline'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await api.get(`rest/system/plugin?repository=${repository.value}`)
    items.value = Array.isArray(data) ? data : (data?.data || [])
  } catch { error.value = t('common.loadError') || 'Load error' }
  loading.value = false
}

/* ---- install dialog ---- */
const installDialog = ref(false)
const installSelection = ref([])
const installSearch = ref('')
const searchResults = ref([])
const searching = ref(false)
const installJavadoc = ref(false)
const installing = ref(false)
const installProgress = reactive({ current: 0, total: 0, label: '' })
let searchTimer = null

function openInstall() { installSelection.value = []; installSearch.value = ''; searchResults.value = []; installJavadoc.value = false; installDialog.value = true }

watch(installSearch, (q) => {
  clearTimeout(searchTimer)
  const term = (q || '').trim()
  if (!term) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const data = await api.get(`rest/system/plugin/search?repository=${repository.value}&q=${encodeURIComponent(term)}`)
      searchResults.value = Array.isArray(data) ? data : (data?.data || [])
    } finally { searching.value = false }
  }, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

async function doInstall() {
  if (!installSelection.value.length) return
  installing.value = true; installProgress.current = 0; installProgress.total = installSelection.value.length
  try {
    for (const entry of installSelection.value) {
      installProgress.current++; installProgress.label = entry.artifact
      await api.post(`rest/system/plugin/${encodeURIComponent(entry.artifact)}?repository=${repository.value}&javadoc=${installJavadoc.value}`)
    }
  } finally { installing.value = false; installDialog.value = false; installSelection.value = []; load() }
}
async function installOne(artifact) { await api.post(`rest/system/plugin/${encodeURIComponent(artifact)}?repository=${repository.value}&javadoc=false`); load() }
async function cancelLocal(item) { await api.del(`rest/system/plugin/${item.artifact}/${item.latestLocalVersion}`); load() }

/* ---- confirm (restart / check / delete) ---- */
const confirm = reactive({ open: false, title: '', text: '', label: '', color: 'brand', icon: 'mdi-puzzle', busy: false, action: () => {} })
function ask(o) { Object.assign(confirm, o, { busy: false, open: true }) }
async function runConfirm() { confirm.busy = true; try { await confirm.action() } finally { confirm.busy = false; confirm.open = false } }
function askRestart() { ask({ title: t('system.plugin.confirmRestartTitle'), text: t('system.plugin.confirmRestartText'), label: t('system.plugin.restart'), color: 'error', icon: 'mdi-restart', action: async () => { restarting.value = true; try { await api.put('rest/system/plugin/restart') } finally { restarting.value = false } } }) }
function askCheckVersions() { ask({ title: t('system.plugin.confirmCheckTitle'), text: t('system.plugin.confirmCheckText', { repository: repository.value }), label: t('system.plugin.confirmCheckLabel'), color: 'brand', icon: 'mdi-magnify-plus-outline', action: async () => { checking.value = true; try { await api.put(`rest/system/plugin/cache?repository=${repository.value}`); await load() } finally { checking.value = false } } }) }
function askRemove(artifact) { ask({ title: t('system.plugin.confirmDeleteTitle'), text: t('system.plugin.confirmDeleteText', { artifact }), label: t('common.delete'), color: 'error', icon: 'mdi-delete-outline', action: async () => { await api.del(`rest/system/plugin/${artifact}`); await load() } }) }

onMounted(() => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('system.breadcrumb') }, { title: t('system.plugin.title') }], { refresh: load })
  load()
})
</script>

<style scoped>
.plugins {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.ph-txt .sub b { color: var(--ink-2); font-family: var(--mono); }
.ph-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.repo { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 11px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-3); font-family: var(--font); font-weight: 600; font-size: 13px; }
.repo select { border: 0; background: transparent; outline: 0; font-family: var(--font); font-weight: 700; font-size: 13px; color: var(--ink); cursor: pointer; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 16px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover:not(:disabled) { filter: brightness(1.04); }
.btn:disabled { opacity: .55; cursor: default; }
.btn.ghost { background: transparent; color: var(--ink-2); border-color: var(--border); box-shadow: none; }
.btn.ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn.ghost-danger { background: transparent; color: rgb(var(--v-theme-error)); border-color: rgba(var(--v-theme-error), .35); box-shadow: none; }
.btn.ghost-danger:hover:not(:disabled) { background: rgba(var(--v-theme-error), .08); }
.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

.tglyph { width: 30px; height: 30px; border-radius: 9px; display: inline-grid; place-items: center; background: var(--pill); color: var(--ink-2); }
.tglyph.service { background: rgba(47, 109, 246, .14); color: #2f6df6; }
.tglyph.tool { background: rgba(255, 122, 24, .14); color: #d9701a; }
.tglyph.feature { background: rgba(29, 157, 99, .14); color: #1d9d63; }
.pname { font-family: var(--font); font-weight: 700; font-size: 13.5px; color: var(--ink); }
.mono { font-family: var(--mono); font-size: 12px; color: var(--ink-2); }
.ver { font-weight: 700; }
.muted { color: var(--ink-3); }
.num { font-family: var(--mono); font-weight: 700; color: var(--ink-2); }
.vchip { display: inline-flex; align-items: center; gap: 2px; font-family: var(--mono); font-size: 10.5px; font-weight: 700; border-radius: 7px; padding: 1px 6px; margin-left: 6px; cursor: pointer; }
.vchip.local { color: var(--accent); background: rgba(var(--v-theme-secondary), .14); }
.vchip.up { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.iconbtn { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); transition: background .15s, color .15s; }
.iconbtn.danger:hover { background: rgba(var(--v-theme-error), .1); color: rgb(var(--v-theme-error)); }

/* .vmodal chrome (shared language) */
.vmodal { --hover: rgba(var(--v-theme-on-surface), .06); --border-2: rgba(var(--v-theme-on-surface), .26); border-radius: 20px !important; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important; }
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 20px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; }
.vmodal-head .x { width: 36px; height: 36px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); }
.vmodal-head .x:hover { background: var(--hover); color: var(--ink); }
.vmodal-body { padding: 12px 24px 6px !important; }
.vmodal :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.prog { margin-top: 12px; }
.prog .bar { height: 7px; border-radius: 5px; background: var(--pill); overflow: hidden; }
.prog .bar i { display: block; height: 100%; background: linear-gradient(90deg, #ff9436, #ff5a52); transition: width .2s; }
.prog p { font-size: 12px; color: var(--ink-3); margin: 6px 0 0; }
.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 14px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn:disabled { opacity: .55; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: dspin .7s linear infinite; }
@keyframes dspin { to { transform: rotate(360deg); } }
</style>
