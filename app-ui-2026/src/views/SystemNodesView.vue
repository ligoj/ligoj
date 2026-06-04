<!--
  SystemNodesView — 2026 "Vibrant" node manager (Administration → Nodes).
  Ports plugin-ui's SystemNodeView logic (rest/node list + create/edit via the
  node dialog + delete of instances) onto the Vibrant chrome: breadcrumb-chip
  header, KPI stat cards with proportion bars, a custom type filter (same
  picker pattern as the locale selector), VibrantDataTable with NodeIcon
  branding, a coloured type pill, NodeModeChip, a glowing status dot and
  edit/delete row actions. Mockup ref: viewNodes.
-->
<template>
  <div class="nodes">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb"><v-icon size="13">mdi-cog-outline</v-icon>{{ t('system.breadcrumb') }}</span><span class="csep">›</span><span class="crumb cur">{{ t('system.node.title') }}</span></nav>
        <h1>{{ t('system.node.title') }}</h1>
        <p class="sub"><b>{{ items.length }}</b> {{ t('system.node.countLabel') }}<span v-if="filter !== 'all'"> · {{ filtered.length }} {{ t('system.node.filtered') }}</span></p>
      </div>
      <div class="ph-actions">
        <div class="vsel" :class="{ open: filterOpen }" ref="filterSel">
          <button type="button" class="vsel-btn" @click="filterOpen = !filterOpen">
            <v-icon size="16">{{ currentFilter.icon }}</v-icon><span class="vlabel">{{ currentFilter.label }}</span><span class="vcaret">▾</span>
          </button>
          <div v-if="filterOpen" class="vsel-menu">
            <button v-for="f in FILTERS" :key="f.id" type="button" class="vsel-opt" :class="{ sel: f.id === filter }" @click="pickFilter(f.id)">
              <v-icon size="16">{{ f.icon }}</v-icon><span class="vlabel">{{ f.label }}</span><span v-if="f.id === filter" class="vok">✓</span>
            </button>
          </div>
        </div>
        <button class="btn" @click="startCreate"><v-icon size="18">mdi-plus</v-icon>{{ t('system.node.new') }}</button>
      </div>
    </header>

    <div class="stats">
      <div v-for="(s, i) in stats" :key="s.key" class="stat" :class="{ active: filter === s.fkey }" :style="{ '--c': s.color, 'animation-delay': (i * 50) + 'ms' }" @click="pickFilter(s.fkey)">
        <div class="stop">
          <span class="sicon"><v-icon size="22">{{ s.icon }}</v-icon></span>
          <div class="sbody"><div class="snum">{{ s.value }}</div><div class="slabel">{{ s.label }}</div></div>
        </div>
        <div class="sbar"><i :style="{ width: s.pct + '%' }" /></div>
      </div>
    </div>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

    <VibrantDataTable :headers="headers" :items="filtered" :items-length="filtered.length" :loading="loading" item-value="id" :empty-text="t('common.noData')" @row-click="startEdit">
      <template #cell.name="{ item }">
        <div class="avatar-cell">
          <span class="nglyph"><NodeIcon :node="item" /></span>
          <div class="ac-txt"><div class="ac-name">{{ item.name || '—' }}</div><code class="ac-key">{{ item.id }}</code></div>
        </div>
      </template>
      <template #cell.type="{ item }"><span class="pill" :class="nodeType(item)">{{ typeLabel(item) }}</span></template>
      <template #cell.mode="{ item }"><NodeModeChip :mode="item.mode || 'all'" size="small" /></template>
      <template #cell.enabled="{ item }">
        <span class="status"><span class="sdot" :class="item.enabled ? 'ok' : 'err'" />{{ item.enabled ? t('system.node.statusEnabled') : t('system.node.statusDisabled') }}</span>
      </template>
      <template #actions="{ item }">
        <template v-if="isInstance(item)">
          <button class="iconbtn" @click.stop="startEdit(item)">
            <v-icon size="18">mdi-pencil-outline</v-icon>
            <v-tooltip activator="parent" :text="t('common.edit')" location="top" />
          </button>
          <button class="iconbtn danger" @click.stop="startDelete(item)">
            <v-icon size="18">mdi-delete-outline</v-icon>
            <v-tooltip activator="parent" :text="t('common.delete')" location="top" />
          </button>
        </template>
      </template>
    </VibrantDataTable>

    <NodeEditDialog v-model="createDialog" @saved="onSaved" />
    <NodeEditDialog v-model="editDialog" :node="editTarget" @saved="onSaved" />
    <LigojConfirmDialog v-model="deleteDialog" :title="t('system.node.deleteTitle')" icon="mdi-server-network" confirm-color="error" :confirm-label="t('common.delete')" :loading="deleting" @confirm="confirmDelete">
      {{ t('system.node.deleteConfirmBefore') }}<strong class="text-error">{{ deleteTarget?.name || deleteTarget?.id }}</strong>{{ t('system.node.deleteConfirmAfter') }}
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useApi, useAppStore, useI18nStore, NodeIcon, NodeModeChip, isInstance, nodeType } from '@ligoj/host'
import VibrantDataTable from '@2026/components/VibrantDataTable.vue'
import NodeEditDialog from '@2026/views/NodeEditDialog.vue'
import LigojConfirmDialog from '@2026/components/VibrantConfirmDialog.vue'

const api = useApi()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const TYPE_COLOR = { service: '#2f6df6', feature: '#1d9d63', tool: '#d9701a', instance: '#8b5cf6' }
const items = ref([])
const loading = ref(false)
const error = ref(null)

const FILTERS = computed(() => [
  { id: 'all', label: t('system.node.filterAll'), icon: 'mdi-format-list-bulleted' },
  { id: 'service', label: t('system.node.typeService'), icon: 'mdi-cube-outline' },
  { id: 'tool', label: t('system.node.typeTool'), icon: 'mdi-hammer-wrench' },
  { id: 'instance', label: t('system.node.typeInstance'), icon: 'mdi-server-outline' },
])
const filter = ref('all')
const currentFilter = computed(() => FILTERS.value.find((f) => f.id === filter.value) || FILTERS.value[0])
const filterOpen = ref(false)
const filterSel = ref(null)
function pickFilter(id) { filter.value = id; filterOpen.value = false }
function onDocClick(e) { if (filterSel.value && !filterSel.value.contains(e.target)) filterOpen.value = false }

const filtered = computed(() => filter.value === 'all' ? items.value : items.value.filter((n) => nodeType(n) === filter.value))

const headers = computed(() => [
  { key: 'name', label: t('system.node.headerName'), sortable: true, icon: 'mdi-server-outline' },
  { key: 'type', label: t('system.node.headerType'), sortable: true, align: 'center', icon: 'mdi-shape-outline' },
  { key: 'mode', label: t('system.node.headerMode'), sortable: false, align: 'center', icon: 'mdi-cog-outline' },
  { key: 'enabled', label: t('system.node.headerStatus'), sortable: true, icon: 'mdi-power' },
])

function typeLabel(item) { const k = nodeType(item); return t('system.node.type' + k.charAt(0).toUpperCase() + k.slice(1)) }

const stats = computed(() => {
  const by = (ty) => items.value.filter((n) => nodeType(n) === ty).length
  const total = items.value.length || 1
  const mk = (key, fkey, label, icon, color, value) => ({ key, fkey, label, icon, color, value, pct: fkey === 'all' ? 100 : Math.round(value / total * 100) })
  return [
    mk('total', 'all', t('system.node.statTotal'), 'mdi-server-network', 'rgb(var(--v-theme-secondary))', items.value.length),
    mk('service', 'service', t('system.node.typeService'), 'mdi-cube-outline', TYPE_COLOR.service, by('service')),
    mk('tool', 'tool', t('system.node.typeTool'), 'mdi-hammer-wrench', TYPE_COLOR.tool, by('tool')),
    mk('instance', 'instance', t('system.node.typeInstance'), 'mdi-server-outline', TYPE_COLOR.instance, by('instance')),
  ]
})

async function load() {
  loading.value = true; error.value = null
  try { const d = await api.get('rest/node'); items.value = Array.isArray(d) ? d : (d?.data || []) }
  catch { error.value = t('common.loadError') || 'Load error' }
  loading.value = false
}

const createDialog = ref(false)
const editDialog = ref(false)
const editTarget = ref(null)
function startCreate() { createDialog.value = true }
function startEdit(item) { editTarget.value = item; editDialog.value = true }
function onSaved() { load() }

const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
function startDelete(item) { deleteTarget.value = item; deleteDialog.value = true }
async function confirmDelete() {
  deleting.value = true
  try { await api.del(`rest/node/${encodeURIComponent(deleteTarget.value.id)}`); deleteDialog.value = false; load() }
  finally { deleting.value = false }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('system.breadcrumb') }, { title: t('system.node.title') }], { refresh: load })
  load()
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.nodes {
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
.btn:hover { filter: brightness(1.04); }
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

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
.stat { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--border); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 9%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); cursor: pointer; opacity: 0; transform: translateY(10px); animation: rise .5s cubic-bezier(.2, .7, .3, 1) forwards; transition: transform .18s cubic-bezier(.2, .7, .3, 1), box-shadow .18s, border-color .18s; }
@keyframes rise { to { opacity: 1; transform: none; } }
.stat:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -20px color-mix(in srgb, var(--c) 55%, transparent); border-color: color-mix(in srgb, var(--c) 30%, var(--border)); }
.stat.active { border-color: color-mix(in srgb, var(--c) 55%, var(--border)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent); }
.stop { display: flex; align-items: center; gap: 14px; }
.sicon { width: 46px; height: 46px; border-radius: 13px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.snum { font-family: var(--mono); font-weight: 700; font-size: 26px; line-height: 1; color: var(--ink); }
.slabel { font-size: 12.5px; font-weight: 600; color: var(--ink-3); margin-top: 4px; }
.sbar { height: 6px; border-radius: 4px; background: var(--pill); overflow: hidden; }
.sbar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 55%, white)); transition: width .5s cubic-bezier(.2, .7, .3, 1); }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

.avatar-cell { display: flex; align-items: center; gap: 12px; }
.nglyph { width: 36px; height: 36px; border-radius: 11px; flex: none; display: grid; place-items: center; background: var(--pill); }
.nglyph :deep(img.tool-icon) { width: 22px; height: 22px; object-fit: contain; }
.nglyph :deep(i) { font-size: 20px; color: var(--ink-2); }
.ac-name { font-family: var(--font); font-weight: 700; font-size: 14px; color: var(--ink); line-height: 1.2; }
.ac-key { font-family: var(--mono); font-size: 11.5px; color: var(--ink-3); }
.pill { display: inline-flex; align-items: center; font-family: var(--font); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; padding: 3px 10px; border-radius: 999px; color: var(--ink-2); background: var(--pill); }
.pill.service { color: #2f6df6; background: rgba(47, 109, 246, .13); }
.pill.tool { color: #d9701a; background: rgba(255, 122, 24, .14); }
.pill.feature { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.pill.instance { color: #8b5cf6; background: rgba(139, 92, 246, .14); }
.status { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: var(--ink-2); }
.sdot { width: 9px; height: 9px; border-radius: 50%; position: relative; }
.sdot::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; background: currentColor; opacity: .2; }
.sdot.ok { background: #1d9d63; color: #1d9d63; }
.sdot.err { background: #df4d42; color: #df4d42; }
.iconbtn { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-3); transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--hover); color: var(--ink); }
.iconbtn.danger:hover { background: rgba(var(--v-theme-error), .1); color: rgb(var(--v-theme-error)); }
</style>
