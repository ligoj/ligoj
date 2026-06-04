<!--
  SystemPluginsView — 2026 "Vibrant" plugin manager. Ports plugin-ui's
  SystemPluginView logic (rest/system/plugin: list / search / install /
  upgrade / delete / check-versions / restart) onto a richer Vibrant chrome:
  KPI stat cards, a custom repository picker (same language-picker pattern as
  the login/profile), VibrantDataTable rows with a coloured type pill, a
  two-line name/artifact cell, a glowing status dot and count chips, plus a
  .vmodal install dialog and VibrantConfirmDialog. Mockup ref: viewPlugins.
-->
<template>
  <div class="plugins">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb"><v-icon size="13">mdi-cog-outline</v-icon>{{ t('system.breadcrumb') }}</span><span class="csep">›</span><span class="crumb cur">{{ t('system.plugin.title') }}</span></nav>
        <h1>{{ t('system.plugin.title') }}</h1>
        <p class="sub"><b>{{ rows.length }}</b> {{ t('system.plugin.countLabel') }}</p>
      </div>
      <div class="ph-actions">
        <!-- Custom repository picker (mirrors the login/profile locale picker). -->
        <div class="vsel" :class="{ open: repoOpen }" ref="repoSel">
          <button type="button" class="vsel-btn" @click="repoOpen = !repoOpen">
            <v-icon size="16">mdi-source-repository</v-icon>
            <span class="vlabel">{{ currentRepo.label }}</span>
            <span class="vcaret">▾</span>
          </button>
          <div v-if="repoOpen" class="vsel-menu">
            <button v-for="r in REPOSITORIES" :key="r.id" type="button" class="vsel-opt" :class="{ sel: r.id === repository }" @click="pickRepo(r.id)">
              <v-icon size="16">{{ r.icon }}</v-icon><span class="vlabel">{{ r.label }}</span>
              <span v-if="r.id === repository" class="vok">✓</span>
            </button>
          </div>
        </div>
        <button class="btn ghost" :disabled="checking" @click="askCheckVersions"><v-icon size="18">mdi-magnify-plus-outline</v-icon>{{ t('system.plugin.checkVersions') }}</button>
        <button class="btn ghost-danger" :disabled="restarting" @click="askRestart"><v-icon size="18">mdi-restart</v-icon>{{ t('system.plugin.restart') }}</button>
        <button class="btn" @click="openInstall"><v-icon size="18">mdi-plus</v-icon>{{ t('system.plugin.install') }}</button>
      </div>
    </header>

    <!-- KPI stat cards -->
    <div class="stats">
      <div v-for="(s, i) in stats" :key="s.key" class="stat" :style="{ '--c': s.color, 'animation-delay': (i * 50) + 'ms' }">
        <div class="stop">
          <span class="sicon"><v-icon size="22">{{ s.icon }}</v-icon></span>
          <div class="sbody">
            <div class="snum">{{ s.value }}<span v-if="s.key !== 'total' && rows.length" class="spct">{{ Math.round(s.pct) }}%</span></div>
            <div class="slabel">{{ s.label }}</div>
          </div>
        </div>
        <div class="sbar"><i :style="{ width: s.pct + '%' }" /></div>
      </div>
    </div>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

    <VibrantDataTable :headers="headers" :items="rows" :items-length="rows.length" :loading="loading" item-value="id" default-sort="name" :empty-text="t('common.noData')">
      <template #cell.name="{ item }">
        <div class="avatar-cell">
          <span v-if="item.node" class="logo-tile"><NodeIcon :node="item.node" /></span>
          <span v-else class="tglyph" :class="item.type"><v-icon size="18">{{ typeIcon(item.type) }}</v-icon></span>
          <div class="ac-txt">
            <div class="ac-name">{{ item.name || '—' }}</div>
            <code class="ac-sub">{{ item.artifact }}</code>
          </div>
        </div>
      </template>
      <template #cell.key="{ item }"><code class="mono">{{ item.key || '—' }}</code></template>
      <template #cell.version="{ item }">
        <span class="mono ver">{{ item.version || '—' }}</span>
        <span v-if="item.latestLocalVersion" class="vchip local" :title="t('system.plugin.cancelLocal')" @click.stop="cancelLocal(item)">{{ item.latestLocalVersion }}<v-icon size="13">mdi-close</v-icon></span>
        <span v-if="item.newVersion && item.newVersion !== item.latestLocalVersion" class="vchip up" :title="t('system.plugin.upgradeAvailable')" @click.stop="installOne(item.artifact)"><v-icon size="13">mdi-arrow-up</v-icon>{{ item.newVersion }}</span>
      </template>
      <template #cell.statut="{ item }"><span class="chip" :class="item.status">{{ statusLabel(item.status) }}</span></template>
      <template #cell.enabled="{ item }">
        <span v-if="item.node" class="switch" :class="{ on: item.enabled, busy: togglingKey === item.key }" role="switch" :aria-checked="item.enabled" :title="t('system.plugin.toggleHint')" @click.stop="toggleEnabled(item)" />
        <span v-else class="muted">—</span>
      </template>
      <template #actions="{ item }">
        <v-icon v-if="item.deleted" size="18" color="warning" :title="t('system.plugin.deletionScheduled')">mdi-cancel</v-icon>
        <button v-else class="iconbtn danger" @click.stop="askRemove(item.artifact)">
          <v-icon size="18">mdi-delete-outline</v-icon>
          <v-tooltip activator="parent" :text="t('system.plugin.delete')" location="top" />
        </button>
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

    <LigojConfirmDialog v-model="confirm.open" :title="confirm.title" :icon="confirm.icon" :icon-color="confirm.color" :message="confirm.text" :confirm-label="confirm.label" :confirm-color="confirm.color" :loading="confirm.busy" @confirm="runConfirm">
      <template v-if="confirm.parts">{{ confirm.parts.before }}<strong class="text-error">{{ confirm.parts.name }}</strong>{{ confirm.parts.after }}</template>
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useApi, useAppStore, useI18nStore, NodeIcon } from '@ligoj/host'
import VibrantDataTable from '@/components/VibrantDataTable.vue'
import LigojConfirmDialog from '@/components/VibrantConfirmDialog.vue'

const api = useApi()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const REPOSITORIES = computed(() => [
  { id: 'central', label: t('system.plugin.repoCentral'), icon: 'mdi-apache-kafka' },
  { id: 'nexus', label: t('system.plugin.repoNexus'), icon: 'mdi-package-variant-closed' },
])
const repository = ref('central')
const currentRepo = computed(() => REPOSITORIES.value.find((r) => r.id === repository.value) || REPOSITORIES.value[0])
const repoOpen = ref(false)
const repoSel = ref(null)
function pickRepo(id) { repository.value = id; repoOpen.value = false; load() }
function onDocClick(e) { if (repoSel.value && !repoSel.value.contains(e.target)) repoOpen.value = false }

const items = ref([])
const loading = ref(false)
const error = ref(null)
const checking = ref(false)
const restarting = ref(false)

const TYPE_COLOR = { service: '#2f6df6', tool: '#d9701a', feature: '#1d9d63' }

const headers = computed(() => [
  { key: 'name', label: t('system.plugin.headerName'), sortable: true, icon: 'mdi-puzzle-outline' },
  { key: 'key', label: t('system.plugin.headerKey'), sortable: true, icon: 'mdi-identifier' },
  { key: 'version', label: t('system.plugin.headerVersion'), sortable: false, icon: 'mdi-tag-outline' },
  { key: 'statut', label: t('system.plugin.headerStatus'), sortable: true, align: 'center', icon: 'mdi-shape-outline' },
  { key: 'enabled', label: t('system.plugin.headerEnabled'), sortable: false, align: 'center', icon: 'mdi-power', width: '110px' },
])

function prettyName(artifact, name) {
  if (name) return name
  return String(artifact || '').replace(/^plugin-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
const rows = computed(() => items.value.map((it) => {
  const enabled = it.node ? (it.node.enabled !== false) : true
  return {
    id: it.plugin?.artifact || it.plugin?.id,
    artifact: it.plugin?.artifact || it.plugin?.id || '',
    type: (it.plugin?.type || '').toLowerCase(),
    name: prettyName(it.plugin?.artifact || it.plugin?.id, it.node?.name || it.plugin?.name),
    key: it.node?.id || '',
    version: it.plugin?.version || '',
    latestLocalVersion: it.latestLocalVersion,
    newVersion: it.newVersion,
    nodes: it.nodes,
    subscriptions: it.subscriptions,
    deleted: it.deleted,
    node: it.node || null,
    enabled,
    status: it.deleted ? 'warn' : (enabled ? 'ok' : 'idle'),
  }
}))

const stats = computed(() => {
  const by = (ty) => rows.value.filter((r) => r.type === ty).length
  const total = rows.value.length || 1
  const pct = (v, k) => k === 'total' ? 100 : Math.round((v / total) * 100)
  return [
    { key: 'total', label: t('system.plugin.statTotal'), value: rows.value.length, icon: 'mdi-puzzle', color: 'rgb(var(--v-theme-secondary))' },
    { key: 'service', label: t('system.plugin.statServices'), value: by('service'), icon: 'mdi-puzzle-outline', color: TYPE_COLOR.service },
    { key: 'tool', label: t('system.plugin.statTools'), value: by('tool'), icon: 'mdi-hammer-wrench', color: TYPE_COLOR.tool },
    { key: 'feature', label: t('system.plugin.statFeatures'), value: by('feature'), icon: 'mdi-wrench-outline', color: TYPE_COLOR.feature },
  ].map((s) => ({ ...s, pct: pct(s.value, s.key) }))
})

function typeIcon(type) {
  if (type === 'feature') return 'mdi-wrench-outline'
  if (type === 'tool') return 'mdi-hammer-wrench'
  return 'mdi-puzzle-outline'
}
function typeLabel(type) { return t('system.plugin.type.' + (type || 'service')) }
function statusLabel(s) { return t('system.plugin.status.' + s) }

/* Enable/disable the plugin's associated node (real action via PUT rest/node,
   keeping parameters via untouchedParameters). Disabling asks for confirm. */
const togglingKey = ref('')
function toggleEnabled(item) {
  if (!item.node) return
  if (item.enabled) {
    ask({ title: t('system.plugin.confirmDisableTitle'), parts: splitAround('system.plugin.confirmDisableText', item.name, 'name'), label: t('system.plugin.disable'), color: 'warning', icon: 'mdi-power', action: () => doToggle(item, false) })
  } else {
    doToggle(item, true)
  }
}
async function doToggle(item, enable) {
  togglingKey.value = item.key
  try {
    await api.put('rest/node', { id: item.node.id, node: item.node.refined?.id, name: item.node.name, mode: item.node.mode || 'all', enabled: enable, untouchedParameters: true })
    await load()
  } finally { togglingKey.value = '' }
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
onBeforeUnmount(() => { clearTimeout(searchTimer); document.removeEventListener('click', onDocClick) })

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
const confirm = reactive({ open: false, title: '', text: '', parts: null, label: '', color: 'brand', icon: 'mdi-puzzle', busy: false, action: () => {} })
function ask(o) { Object.assign(confirm, { parts: null, ...o, busy: false, open: true }) }
/* Split a translated sentence around a value so it can be rendered bold-red. */
function splitAround(key, value, param) {
  const full = t(key, { [param]: value })
  const i = full.indexOf(value)
  return i < 0 ? { before: full, name: '', after: '' } : { before: full.slice(0, i), name: value, after: full.slice(i + value.length) }
}
async function runConfirm() { confirm.busy = true; try { await confirm.action() } finally { confirm.busy = false; confirm.open = false } }
function askRestart() { ask({ title: t('system.plugin.confirmRestartTitle'), text: t('system.plugin.confirmRestartText'), label: t('system.plugin.restart'), color: 'error', icon: 'mdi-restart', action: async () => { restarting.value = true; try { await api.put('rest/system/plugin/restart') } finally { restarting.value = false } } }) }
function askCheckVersions() { ask({ title: t('system.plugin.confirmCheckTitle'), text: t('system.plugin.confirmCheckText', { repository: repository.value }), label: t('system.plugin.confirmCheckLabel'), color: 'brand', icon: 'mdi-magnify-plus-outline', action: async () => { checking.value = true; try { await api.put(`rest/system/plugin/cache?repository=${repository.value}`); await load() } finally { checking.value = false } } }) }
function askRemove(artifact) { ask({ title: t('system.plugin.confirmDeleteTitle'), parts: splitAround('system.plugin.confirmDeleteText', artifact, 'artifact'), label: t('common.delete'), color: 'error', icon: 'mdi-delete-outline', action: async () => { await api.del(`rest/system/plugin/${artifact}`); await load() } }) }

onMounted(() => {
  document.addEventListener('click', onDocClick)
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('system.breadcrumb') }, { title: t('system.plugin.title') }], { refresh: load })
  load()
})
</script>

<style scoped>
.plugins {
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
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 16px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover:not(:disabled) { filter: brightness(1.04); }
.btn:disabled { opacity: .55; cursor: default; }
.btn.ghost { background: transparent; color: var(--ink-2); border-color: var(--border); box-shadow: none; }
.btn.ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn.ghost-danger { background: transparent; color: rgb(var(--v-theme-error)); border-color: rgba(var(--v-theme-error), .35); box-shadow: none; }
.btn.ghost-danger:hover:not(:disabled) { background: rgba(var(--v-theme-error), .08); }

/* Custom repository picker (login/profile locale-picker pattern) */
.vsel { position: relative; }
.vsel-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-2); font-family: var(--font); font-size: 14px; font-weight: 700; line-height: 1.2; cursor: pointer; transition: border-color .15s; }
.vsel-btn:hover { border-color: var(--border-2); }
.vcaret { color: var(--ink-3); font-size: 11px; transition: transform .2s; }
.vsel.open .vcaret { transform: rotate(180deg); }
.vsel-menu { position: absolute; top: calc(100% + 6px); right: 0; min-width: 190px; background: var(--surface); border: 1px solid var(--border); border-radius: 13px; box-shadow: 0 16px 36px -14px rgba(0, 0, 0, .3); padding: 5px; z-index: 20; animation: vmenu .12s ease; }
@keyframes vmenu { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.vsel-opt { width: 100%; display: flex; align-items: center; gap: 9px; padding: 9px 11px; border: 0; background: transparent; border-radius: 9px; color: var(--ink); font-family: var(--font); font-size: 13.5px; font-weight: 600; cursor: pointer; text-align: left; }
.vsel-opt:hover { background: var(--hover); }
.vsel-opt.sel { color: var(--accent); }
.vlabel { white-space: nowrap; }
.vok { margin-left: auto; color: var(--accent); font-weight: 800; }

/* KPI stat cards */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
.stat { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--border); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 9%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); overflow: hidden; opacity: 0; transform: translateY(10px); animation: rise .5s cubic-bezier(.2, .7, .3, 1) forwards; transition: transform .18s cubic-bezier(.2, .7, .3, 1), box-shadow .18s, border-color .18s; }
.stat:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -20px color-mix(in srgb, var(--c) 55%, transparent); border-color: color-mix(in srgb, var(--c) 30%, var(--border)); }
@keyframes rise { to { opacity: 1; transform: none; } }
.stop { display: flex; align-items: center; gap: 14px; }
.sicon { width: 46px; height: 46px; border-radius: 13px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.snum { display: flex; align-items: baseline; gap: 7px; font-family: var(--mono); font-weight: 700; font-size: 26px; line-height: 1; color: var(--ink); }
.spct { font-size: 12px; font-weight: 700; color: color-mix(in srgb, var(--c) 70%, var(--ink-3)); }
.slabel { font-size: 12.5px; font-weight: 600; color: var(--ink-3); margin-top: 4px; }
.sbar { height: 6px; border-radius: 4px; background: var(--pill); overflow: hidden; }
.sbar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 55%, white)); transition: width .5s cubic-bezier(.2, .7, .3, 1); }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

/* table cells */
.avatar-cell { display: flex; align-items: center; gap: 12px; }
.tglyph { width: 36px; height: 36px; border-radius: 11px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #8a92a3, #5b6472); }
.tglyph.service { background: linear-gradient(135deg, #2f6df6, #2552c9); }
.tglyph.tool { background: linear-gradient(135deg, #ff9436, #d9701a); }
.tglyph.feature { background: linear-gradient(135deg, #1d9d63, #15784b); }
.ac-name { font-family: var(--font); font-weight: 700; font-size: 14px; color: var(--ink); line-height: 1.2; }
.ac-key, .ac-sub { font-family: var(--mono); font-size: 11.5px; color: var(--ink-3); }
/* Brand logo tile (white, like the cockpit tool logos). */
.logo-tile { width: 36px; height: 36px; border-radius: 11px; flex: none; display: grid; place-items: center; background: #fff; box-shadow: 0 0 0 1px var(--border), 0 2px 6px -3px rgba(0, 0, 0, .3); }
.logo-tile :deep(img.tool-icon) { width: 22px; height: 22px; object-fit: contain; }
.logo-tile :deep(i) { font-size: 20px; color: #475569; }
/* Status chip (mockup .chip). */
.chip { display: inline-flex; align-items: center; font-family: var(--font); font-weight: 700; font-size: 11.5px; padding: 3px 11px; border-radius: 999px; }
.chip.ok { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.chip.warn { color: #d98a16; background: rgba(217, 138, 22, .16); }
.chip.err { color: #df4d42; background: rgba(223, 77, 66, .14); }
.chip.idle { color: var(--ink-3); background: var(--pill); }
/* Toggle switch (mockup .switch). */
.switch { display: inline-block; width: 44px; height: 25px; border-radius: 20px; background: var(--border-2); position: relative; cursor: pointer; transition: background .2s, opacity .2s; vertical-align: middle; }
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 19px; height: 19px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, .35); transition: left .2s; }
.switch.on { background: #1d9d63; }
.switch.on::after { left: 22px; }
.switch.busy { opacity: .5; pointer-events: none; }
.pill { display: inline-flex; align-items: center; font-family: var(--font); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; padding: 3px 10px; border-radius: 999px; color: var(--ink-2); background: var(--pill); }
.pill.service { color: #2f6df6; background: rgba(47, 109, 246, .13); }
.pill.tool { color: #d9701a; background: rgba(255, 122, 24, .14); }
.pill.feature { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.mono { font-family: var(--mono); font-size: 12px; color: var(--ink-2); }
.ver { font-weight: 700; }
.muted { color: var(--ink-3); }
.cchip { display: inline-grid; place-items: center; min-width: 26px; height: 24px; padding: 0 8px; border-radius: 8px; font-family: var(--mono); font-weight: 700; font-size: 12px; color: var(--ink-2); background: var(--pill); }
.sdot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; position: relative; }
.sdot::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; background: currentColor; opacity: .2; }
.sdot.ok { background: #1d9d63; color: #1d9d63; }
.sdot.warn { background: #d98a16; color: #d98a16; }
.vchip { display: inline-flex; align-items: center; gap: 2px; font-family: var(--mono); font-size: 10.5px; font-weight: 700; border-radius: 7px; padding: 1px 6px; margin-left: 6px; cursor: pointer; }
.vchip.local { color: var(--accent); background: rgba(var(--v-theme-secondary), .14); }
.vchip.up { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.iconbtn { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); transition: background .15s, color .15s; }
.iconbtn.danger:hover { background: rgba(var(--v-theme-error), .1); color: rgb(var(--v-theme-error)); }

/* .vmodal chrome */
.vmodal { border-radius: 20px !important; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important; }
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
