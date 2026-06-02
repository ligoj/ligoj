<!--
  ProjectsView — 2026 "Vibrant" Projects cockpit. Faithful to the validated
  mockup (design/ligoj-2026-prototype.html → viewProjects): a grid of project
  cards with a folder glyph, name + key, subscription count, a tool-logo set,
  and a footer "open" link + health bar. Loads real projects from rest/project
  (DataTables shape); falls back to the mockup's sample data when the backend
  has none, so the cockpit is never empty in preview.
-->
<template>
  <div class="projects">
    <header class="ph">
      <div class="ph-txt">
        <h1>{{ t('project.title') }}</h1>
        <p class="sub"><b>{{ total }}</b> {{ t('project.countLabel') }}<span v-if="demoMode"> · {{ t('common.preview') || 'aperçu' }}</span></p>
      </div>
      <div class="ph-actions">
        <button class="btn" @click="openNew"><v-icon size="18">mdi-plus</v-icon>{{ t('project.new') }}</button>
      </div>
    </header>

    <div class="toolbar">
      <label class="search">
        <v-icon size="18">mdi-magnify</v-icon>
        <input v-model="search" :placeholder="t('project.searchPlaceholder')" />
      </label>
    </div>

    <div v-if="loading && !items.length" class="grid">
      <div v-for="n in 6" :key="n" class="card skeleton" />
    </div>

    <div v-else-if="filtered.length" class="grid">
      <article v-for="(p, i) in filtered" :key="p.id ?? p.pkey" class="card" :style="{ '--c': '#2f6df6', 'animation-delay': (i * 45) + 'ms' }" @click="openProject(p)">
        <div class="card-head">
          <div class="glyph"><v-icon color="#2f6df6" size="24">mdi-folder</v-icon></div>
          <div class="t">
            <div class="name">{{ p.name }}</div>
            <div class="kind">{{ p.pkey }}</div>
          </div>
          <div class="count">{{ p.subs }} <small>{{ t('project.subsShort') }}</small></div>
        </div>
        <div class="rows">
          <div class="toolset">
            <template v-for="tool in (p.tools || []).slice(0, 8)" :key="tool">
              <img v-if="toolLogo(tool) && !failedLogos.has(tool)" class="toollogo" :src="toolLogo(tool)" :alt="tool" :title="tool" loading="lazy" @error="failedLogos.add(tool)" />
              <span v-else class="toolchip" :style="{ '--tc': toolColor(tool) }" :title="tool">{{ initials(tool) }}</span>
            </template>
            <span v-if="(p.tools || []).length > 8" class="toolmore">+{{ p.tools.length - 8 }}</span>
            <span v-if="!(p.tools || []).length" class="toolnone">{{ t('project.noTool') }}</span>
          </div>
        </div>
        <div class="card-foot">
          <a class="morelink">{{ t('project.open') }} →</a>
          <span v-if="p.health != null" class="health"><span class="barh"><i :style="{ width: Math.round(p.health * 100) + '%' }" /></span>{{ Math.round(p.health * 100) }}%</span>
        </div>
      </article>
    </div>

    <div v-else class="empty">{{ t('common.noData') || 'Aucune donnée' }}</div>

    <ProjectEditDialog v-model="editDialog" :project="editTarget" @saved="onSaved" />

    <div class="toast" :class="{ show: toastMsg }">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, useAppStore, useI18nStore } from '@ligoj/host'
import ProjectEditDialog from '@2026/views/ProjectEditDialog.vue'

const router = useRouter()
const api = useApi()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

/* Tool brand colours (mockup palette) — used to tint the toolset chips. */
const TOOL_COLORS = {
  Jira: '#2563eb', Jenkins: '#d33833', LDAP: '#15a06a', SonarQube: '#4e9bcd',
  Confluence: '#e6a019', 'AWS EC2': '#7cb518', GitLab: '#7759c2',
  'Provisioning AWS': '#ff7a18', 'Squash TM': '#e0524a',
}
function toolColor(name) { return TOOL_COLORS[name] || '#8a92a3' }
function initials(name) { return (name || '?').replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() }

/* Official brand logos (mockup map) via the Iconify CDN — full-colour
   `logos:*`, monochrome `mdi:*` tinted with the tool colour. Falls back to a
   coloured initials chip on error (see failedLogos). For REAL subscriptions
   (with a node id) the host's NodeIcon would serve the plugin's embedded
   logo; demo tools are keyed by name, so we use the brand catalogue here. */
const LOGOS = {
  Jira: 'logos:jira', Jenkins: 'logos:jenkins', SonarQube: 'logos:sonarqube',
  Confluence: 'logos:confluence', 'AWS EC2': 'logos:aws-ec2', GitLab: 'logos:gitlab',
  'Provisioning AWS': 'logos:aws', LDAP: 'mdi:folder-account-outline', 'Squash TM': 'mdi:clipboard-check-outline',
}
const failedLogos = ref(new Set())
function toolLogo(name) {
  const icon = LOGOS[name]
  if (!icon) return null
  const tint = icon.startsWith('logos:') ? '' : ('&color=' + encodeURIComponent((toolColor(name)).replace('#', '%23')))
  return `https://api.iconify.design/${icon}.svg?height=26${tint}`
}

/* Sample projects from the validated mockup — shown when the backend has
   none, so the cockpit is never empty in the preview. */
const DEMO_PROJECTS = [
  { pkey: 'bnpp-kyc', name: 'BNPP — KYC', tools: ['Jira', 'Jenkins', 'SonarQube', 'GitLab'], subs: 14, health: .78 },
  { pkey: 'airbus-keycopter', name: 'Airbus — Keycopter', tools: ['Jira', 'Jenkins', 'Confluence'], subs: 9, health: .9 },
  { pkey: 'edf-consoweb', name: 'EDF — Consoweb', tools: ['Jira', 'SonarQube', 'LDAP'], subs: 11, health: .84 },
  { pkey: 'datasync-fw', name: 'Datasync Framework', tools: ['Provisioning AWS', 'AWS EC2', 'GitLab'], subs: 7, health: .66 },
  { pkey: 'acoss-kpi', name: 'Acoss — Portail KPI', tools: ['Squash TM', 'Jira', 'Confluence'], subs: 8, health: .81 },
  { pkey: 'anru-agora', name: 'ANRU — Agora', tools: ['Jira', 'LDAP'], subs: 5, health: .93 },
]

const items = ref([])
const total = ref(0)
const loading = ref(false)
const demoMode = ref(false)
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.pkey || '').toLowerCase().includes(q))
})

/* Map a raw Ligoj project (DataTables row) to the card's shape. */
function mapProject(p) {
  const subs = Array.isArray(p.subscriptions) ? p.subscriptions : []
  const tools = [...new Set(subs.map((s) => s?.node?.name || s?.node?.id || s?.name).filter(Boolean))]
  return {
    id: p.id, name: p.name, pkey: p.pkey,
    subs: p.nbSubscriptions ?? subs.length ?? 0,
    tools,
    health: typeof p.health === 'number' ? p.health : null,
  }
}

async function load() {
  loading.value = true
  try {
    const data = await api.get('rest/project?rows=100&page=1&sidx=name&sord=asc')
    const rows = Array.isArray(data) ? data : (data?.data || [])
    if (rows.length) {
      items.value = rows.map(mapProject)
      total.value = data?.recordsTotal ?? rows.length
      demoMode.value = false
    } else {
      items.value = DEMO_PROJECTS
      total.value = DEMO_PROJECTS.length
      demoMode.value = true
    }
  } catch {
    items.value = DEMO_PROJECTS
    total.value = DEMO_PROJECTS.length
    demoMode.value = true
  }
  loading.value = false
}

let toastT
const toastMsg = ref('')
function toast(msg) { toastMsg.value = msg; clearTimeout(toastT); toastT = setTimeout(() => (toastMsg.value = ''), 2200) }
function openProject(p) { router.push(`/project/${p.id ?? p.pkey}`) }

const editDialog = ref(false)
const editTarget = ref(null)
function openNew() { editTarget.value = null; editDialog.value = true }
/* After a create/edit: jump straight to the new project's detail (so the
   user lands on the cockpit they just populated); on edit, reload the grid. */
function onSaved({ id, created }) {
  if (created && id != null && typeof id !== 'object') router.push(`/project/${id}`)
  else load()
}

onMounted(() => {
  appStore.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('project.title') }], { refresh: load })
  load()
})
</script>

<style scoped>
.projects {
  --surface: rgb(var(--v-theme-surface));
  --card: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --radius: 18px;
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; color: var(--ink); }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.ph-txt .sub b { color: var(--ink-2); font-family: var(--mono); }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 11px 17px; border-radius: 12px; cursor: pointer; border: 0; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover { filter: brightness(1.04); }

.toolbar { margin-bottom: 18px; }
.search { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 520px; padding: 9px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-3); transition: border-color .15s, box-shadow .15s; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(var(--v-theme-secondary), .15); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; font-family: var(--font); font-size: 14px; color: var(--ink); }
.search input::placeholder { color: var(--ink-3); }

/* Card cockpit (mockup .grid/.card/...). */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 18px; }
.card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: 0 2px 6px rgba(0, 0, 0, .05); cursor: pointer; opacity: 0; transform: translateY(12px); animation: rise .5s cubic-bezier(.2, .7, .3, 1) forwards; transition: transform .18s cubic-bezier(.2, .7, .3, 1), box-shadow .18s; }
@keyframes rise { to { opacity: 1; transform: none; } }
.card:hover { transform: translateY(-4px); box-shadow: 0 26px 50px -22px color-mix(in srgb, var(--c) 55%, transparent); }
.card.skeleton { height: 180px; cursor: default; animation: none; opacity: 1; transform: none; background: linear-gradient(100deg, var(--card), color-mix(in srgb, var(--ink) 4%, var(--card)), var(--card)); background-size: 200% 100%; animation: shimmer 1.3s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }

.card-head { display: flex; align-items: center; gap: 13px; padding: 18px 16px 16px; background: linear-gradient(180deg, color-mix(in srgb, var(--c) 16%, var(--card)), color-mix(in srgb, var(--c) 5%, var(--card))); border-bottom: 1px solid color-mix(in srgb, var(--c) 16%, var(--border)); }
.glyph { width: 46px; height: 46px; border-radius: 14px; flex: none; display: grid; place-items: center; background: var(--card); box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--c) 50%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--c) 22%, var(--border)); }
.card-head .t { flex: 1; min-width: 0; }
.card-head .name { font-family: var(--font); font-weight: 800; font-size: 17px; letter-spacing: -.03em; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-head .kind { font-family: var(--mono); font-size: 11.5px; font-weight: 700; color: color-mix(in srgb, var(--c) 55%, var(--ink-3)); text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; }
.count { font-family: var(--mono); font-size: 12.5px; font-weight: 700; color: color-mix(in srgb, var(--c) 65%, var(--ink)); background: var(--card); border: 1px solid color-mix(in srgb, var(--c) 22%, var(--border)); border-radius: 9px; padding: 5px 9px; white-space: nowrap; }
.count small { opacity: .5; }

.rows { padding: 14px 16px; }
.toolset { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.toollogo { width: 28px; height: 28px; border-radius: 7px; object-fit: contain; background: #fff; padding: 3px; box-shadow: 0 0 0 1px var(--border), 0 2px 6px -3px rgba(0, 0, 0, .35); }
.toolchip { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; font-family: var(--mono); font-weight: 700; font-size: 10px; color: #fff; background: var(--tc); box-shadow: 0 2px 6px -2px color-mix(in srgb, var(--tc) 60%, transparent); }
.toolmore { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink-3); }
.toolnone { font-size: 12.5px; color: var(--ink-3); }

.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 16px 16px; }
.morelink { font-size: 12.5px; font-weight: 800; color: color-mix(in srgb, var(--c) 55%, var(--ink)); }
.health { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--ink-3); }
.barh { width: 80px; height: 7px; border-radius: 5px; background: var(--pill); overflow: hidden; }
.barh i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 60%, white)); }

.empty { padding: 60px 0; text-align: center; color: var(--ink-3); font-weight: 600; }

.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(16px); background: var(--ink); color: var(--surface); padding: 11px 18px; border-radius: 12px; font-weight: 700; font-size: 14px; z-index: 60; opacity: 0; transition: .25s; pointer-events: none; box-shadow: 0 12px 30px -10px rgba(0, 0, 0, .5); }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
