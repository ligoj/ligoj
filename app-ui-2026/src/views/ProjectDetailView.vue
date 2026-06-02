<!--
  ProjectDetailView — 2026 "Vibrant" project detail. Faithful to the validated
  mockup (design/ligoj-2026-prototype.html → viewProject): a header with the
  project name/key + a "subscribe" CTA, then a grid of tool cards. Each card
  groups the project's subscriptions by their tool (service), shows the tool
  glyph (real plugin logo via the host's NodeIcon), a per-subscription row list
  (status dot + name + pills) and a footer health bar.

  Real wiring: rest/project/:id for the project + its subscriptions, then
  rest/subscription/status/refresh to pull the live status/data of each one
  (mirrors plugin-ui's ProjectDetailView). Falls back to the mockup's sample
  tools when the backend has no such project, so the detail is never empty in
  preview.
-->
<template>
  <div class="pdetail">
    <header class="ph">
      <div class="ph-txt">
        <a class="back" @click="router.push('/project')"><v-icon size="16">mdi-arrow-left</v-icon>{{ t('project.title') }}</a>
        <h1>{{ project?.name || '…' }}</h1>
        <p class="sub">
          <span class="pkey">{{ project?.pkey }}</span>
          <span class="dot">·</span>
          <b>{{ subscriptions.length }}</b> {{ t('project.detail.subscriptions').toLowerCase() }}
          <span v-if="demoMode"> · {{ t('common.preview') }}</span>
        </p>
      </div>
      <div class="ph-actions">
        <button v-if="!demoMode" class="btn ghost" @click="editDialog = true"><v-icon size="18">mdi-pencil</v-icon>{{ t('project.detail.edit') }}</button>
        <button class="btn" @click="openSubscribe"><v-icon size="18">mdi-plus</v-icon>{{ t('project.detail.addSubscription') }}</button>
      </div>
    </header>

    <!-- Audit strip -->
    <div v-if="project && (project.teamLeader || project.description)" class="meta">
      <span v-if="project.teamLeader"><v-icon size="15">mdi-account-star</v-icon>{{ leaderName }}</span>
      <span v-if="project.description" class="desc">{{ project.description }}</span>
    </div>

    <div v-if="loading && !groups.length" class="grid">
      <div v-for="n in 4" :key="n" class="card skeleton" />
    </div>

    <div v-else-if="groups.length" class="grid">
      <article v-for="(g, i) in groups" :key="g.key" class="card" :style="{ '--c': g.color, 'animation-delay': (i * 45) + 'ms' }">
        <div class="card-head">
          <div class="glyph"><component :is="g.icon" /></div>
          <div class="t">
            <div class="name">{{ g.name }}</div>
            <div class="kind">{{ g.kind }}</div>
          </div>
          <div class="count">{{ g.rows.length }} <small>{{ t('project.detail.activeShort') }}</small></div>
        </div>
        <div class="rows">
          <div v-for="(r, j) in g.rows.slice(0, 4)" :key="j" class="row">
            <span class="st" :class="r.status" />
            <span class="rn">{{ r.name }}</span>
            <span class="pills">
              <!-- Live plugin-rendered details (e.g. prov cost/quota chips)
                   when the owning plugin bundle is loaded; falls back to the
                   synthetic status/id pills otherwise. -->
              <PluginFeatures v-if="r.sub" :subscription="r.sub" action="renderDetailsFeatures" />
              <span v-for="(p, k) in r.pills" :key="k" class="pill" :class="{ cost: r.cost }">{{ p }}</span>
            </span>
          </div>
          <div v-if="g.rows.length > 4" class="rowmore">+{{ g.rows.length - 4 }} {{ t('project.detail.more') }}</div>
        </div>
        <div class="card-foot">
          <a class="morelink">{{ t('project.detail.configure') }} →</a>
          <span class="health"><span class="barh"><i :style="{ width: Math.round(g.health * 100) + '%' }" /></span>{{ Math.round(g.health * 100) }}%</span>
        </div>
      </article>
    </div>

    <div v-else class="empty">
      <v-icon size="44" color="rgba(var(--v-theme-on-surface),.25)">mdi-cloud-off-outline</v-icon>
      <p>{{ t('project.detail.noSubscriptions') }}</p>
      <button class="btn" @click="openSubscribe"><v-icon size="18">mdi-plus</v-icon>{{ t('project.detail.addSubscription') }}</button>
    </div>

    <ProjectEditDialog v-model="editDialog" :project="project" @saved="load" />
    <SubscribeWizardDialog v-model="subscribeDialog" :project-id="project?.id" :project-name="project?.name" @saved="load" />

    <div class="toast" :class="{ show: toastMsg }">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi, useAppStore, useI18nStore, NodeIcon, VIcon, PluginFeatures } from '@ligoj/host'
import ProjectEditDialog from '@2026/views/ProjectEditDialog.vue'
import SubscribeWizardDialog from '@2026/views/SubscribeWizardDialog.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

/* Tool brand colours (mockup palette) used to tint each tool card. Keyed by
   tool name; unknown tools fall back to the cockpit blue. */
const TOOL_COLORS = {
  Jira: '#2563eb', Jenkins: '#d33833', LDAP: '#15a06a', SonarQube: '#4e9bcd',
  Confluence: '#e6a019', 'AWS EC2': '#7cb518', GitLab: '#7759c2',
  'Provisioning AWS': '#ff7a18', 'Squash TM': '#e0524a',
}
function toolColor(name) {
  if (TOOL_COLORS[name]) return TOOL_COLORS[name]
  // Deterministic hue from the name so real tools still get a stable colour.
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return `hsl(${Math.abs(hash) % 360} 62% 52%)`
}

/* Map a backend status (NodeStatus UP/DOWN, or a string) to a mockup dot. */
function statusDot(raw) {
  const s = String(raw?.status ?? raw ?? '').toLowerCase()
  if (s === 'up' || s === 'ok') return 'ok'
  if (s === 'down' || s === 'error' || s === 'ko') return 'err'
  if (s === 'warn' || s === 'blocked') return 'warn'
  return 'idle'
}

const project = ref(null)
const loading = ref(false)
const demoMode = ref(false)

const subscriptions = computed(() => project.value?.subscriptions || [])
const leaderName = computed(() => {
  const l = project.value?.teamLeader
  if (!l) return ''
  return [l.firstName, l.lastName].filter(Boolean).join(' ') || l.id || ''
})

/* Group the project's subscriptions by their tool (node.refined) into cockpit
   cards. Each row is one subscription; health = share of UP rows. */
const groups = computed(() => {
  if (demoMode.value) return demoGroups.value
  const byTool = new Map()
  for (const s of subscriptions.value) {
    const node = s.node || {}
    const tool = node.refined || node
    const key = tool.id || node.id || String(s.id)
    if (!byTool.has(key)) {
      byTool.set(key, {
        key,
        name: tool.name || node.name || key,
        kind: node.refined?.refined?.name || tool.id || '',
        color: toolColor(tool.name || node.name),
        icon: () => h(NodeIcon, { node: tool }),
        rows: [],
      })
    }
    const status = statusDot(s.status)
    const pills = []
    const frag = (node.id || '').split(':').pop()
    if (frag && frag !== node.id) pills.push(frag)
    pills.push(t('subscription.status.' + status))
    byTool.get(key).rows.push({ name: node.name || node.id || ('#' + s.id), status, pills, sub: s })
  }
  const out = [...byTool.values()]
  for (const g of out) {
    const ok = g.rows.filter((r) => r.status === 'ok').length
    g.health = g.rows.length ? ok / g.rows.length : 0
  }
  return out
})

async function load() {
  const id = route.params.id
  // Demo projects are keyed by pkey (non-numeric) — render the mockup tools.
  if (!/^\d+$/.test(String(id))) { buildDemo(String(id)); return }
  loading.value = true
  try {
    const data = await api.get(`rest/project/${id}`)
    if (data && data.id != null) {
      project.value = data
      demoMode.value = false
      setCrumbs(data.name)
      refreshSubscriptions()
    } else {
      buildDemo(String(id))
    }
  } catch {
    buildDemo(String(id))
  }
  loading.value = false
}

/* Pull live status/data for each subscription and merge it in (best effort;
   the cards stay usable with the stale data if it fails). */
async function refreshSubscriptions() {
  const subs = project.value?.subscriptions || []
  if (!subs.length) return
  try {
    const q = subs.map((s) => `id=${encodeURIComponent(s.id)}`).join('&')
    const fresh = await api.get(`rest/subscription/status/refresh?${q}`)
    if (!fresh || typeof fresh !== 'object') return
    project.value = {
      ...project.value,
      subscriptions: subs.map((s) => {
        const f = fresh[s.id]
        return f ? { ...s, parameters: f.parameters, data: f.data, status: f.status } : s
      }),
    }
  } catch { /* keep stale */ }
}

/* ---- Demo fallback (mockup viewProject) ---- */
const DEMO_PROJECTS = {
  'bnpp-kyc': { name: 'BNPP — KYC', tools: ['Jira', 'Jenkins', 'SonarQube', 'GitLab'] },
  'airbus-keycopter': { name: 'Airbus — Keycopter', tools: ['Jira', 'Jenkins', 'Confluence'] },
  'edf-consoweb': { name: 'EDF — Consoweb', tools: ['Jira', 'SonarQube', 'LDAP'] },
  'datasync-fw': { name: 'Datasync Framework', tools: ['Provisioning AWS', 'AWS EC2', 'GitLab'] },
  'acoss-kpi': { name: 'Acoss — Portail KPI', tools: ['Squash TM', 'Jira', 'Confluence'] },
  'anru-agora': { name: 'ANRU — Agora', tools: ['Jira', 'LDAP'] },
}
const DEMO_TOOLS = {
  Jira: { kind: 'Tickets', logo: 'logos:jira', health: .82, rows: [{ n: 'JIRA — Prod', s: 'ok', p: ['38 open', '73 closed'] }, { n: 'JIRA — Staging', s: 'warn', p: ['12 open'] }] },
  Jenkins: { kind: 'CI', logo: 'logos:jenkins', health: .61, rows: [{ n: 'Pipeline — main', s: 'ok', p: ['#1842'] }, { n: 'Pipeline — release', s: 'err', p: ['failed'] }] },
  LDAP: { kind: 'Directory', logo: 'mdi:folder-account-outline', health: .94, rows: [{ n: 'delivery-core', s: 'ok', p: ['10 mbr'] }, { n: 'support-lille', s: 'ok', p: ['5 mbr'] }] },
  SonarQube: { kind: 'Code quality', logo: 'logos:sonarqube', health: .7, rows: [{ n: 'core', s: 'ok', p: ['A'] }, { n: 'android', s: 'warn', p: ['B'] }] },
  Confluence: { kind: 'Docs', logo: 'logos:confluence', health: .88, rows: [{ n: 'Space — Delivery', s: 'ok', p: ['2.3 k'] }] },
  'AWS EC2': { kind: 'Provisioning', logo: 'logos:aws-ec2', health: .55, rows: [{ n: 'i-06755957', s: 'ok', p: ['running'] }, { n: 'i-0ecb5aca', s: 'err', p: ['stopped'] }] },
  GitLab: { kind: 'Source & MR', logo: 'logos:gitlab', health: .9, rows: [{ n: 'platform / core', s: 'ok', p: ['4 MR'] }, { n: 'platform / ui', s: 'ok', p: ['2 MR'] }] },
  'Provisioning AWS': { kind: 'Cloud cost', logo: 'logos:aws', health: .76, rows: [{ n: 'Datasync', s: 'ok', p: ['8 CPU', '303 $'], cost: true }, { n: 'Loader SAP', s: 'warn', p: ['428 $'], cost: true }] },
  'Squash TM': { kind: 'Tests', logo: 'mdi:clipboard-check-outline', health: .8, rows: [{ n: 'Portail KPI', s: 'ok', p: ['120'] }] },
}
function logoVNode(name) {
  const icon = DEMO_TOOLS[name]?.logo
  if (!icon) return () => h(VIcon, null, () => 'mdi-puzzle-outline')
  const tint = icon.startsWith('logos:') ? '' : ('&color=' + encodeURIComponent(toolColor(name).replace('#', '%23')))
  const src = `https://api.iconify.design/${icon}.svg?height=26${tint}`
  return () => h('img', { src, alt: name, class: 'demo-logo' })
}
const demoGroups = ref([])
function buildDemo(pkey) {
  const dp = DEMO_PROJECTS[pkey] || DEMO_PROJECTS['bnpp-kyc']
  demoMode.value = true
  project.value = { name: dp.name, pkey, subscriptions: dp.tools.flatMap((tn) => (DEMO_TOOLS[tn]?.rows || []).map((_, k) => ({ id: tn + k }))) }
  demoGroups.value = dp.tools.map((tn) => {
    const td = DEMO_TOOLS[tn] || { kind: '', health: 0, rows: [] }
    return {
      key: tn, name: tn, kind: td.kind, color: toolColor(tn), icon: logoVNode(tn),
      health: td.health,
      rows: td.rows.map((r) => ({ name: r.n, status: r.s, cost: r.cost, pills: r.p })),
    }
  })
  setCrumbs(dp.name)
}

function setCrumbs(name) {
  appStore.setBreadcrumbs(
    [{ title: t('nav.home'), to: '/' }, { title: t('project.title'), to: '/project' }, { title: name }],
    { refresh: load },
  )
}

const editDialog = ref(false)
const subscribeDialog = ref(false)
/* The wizard needs a real project id; demo projects can't subscribe. */
function openSubscribe() {
  if (demoMode.value) { toast(t('project.detail.demoSubscribe')); return }
  subscribeDialog.value = true
}

let toastT
const toastMsg = ref('')
function toast(msg) { toastMsg.value = msg; clearTimeout(toastT); toastT = setTimeout(() => (toastMsg.value = ''), 2200) }

watch(() => route.params.id, (id) => { if (id) load() })
onMounted(load)
</script>

<style scoped>
.pdetail {
  --surface: rgb(var(--v-theme-surface));
  --card: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --ok: #1d9d63; --warn: #d98a16; --err: #df4d42; --idle: #bcb6a8;
  --radius: 18px;
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 14px; }
.back { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font); font-weight: 700; font-size: 12.5px; color: var(--ink-3); cursor: pointer; margin-bottom: 6px; transition: color .15s; }
.back:hover { color: var(--accent); }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; color: var(--ink); }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.ph-txt .sub .pkey { font-family: var(--mono); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-2); background: var(--pill); border-radius: 7px; padding: 2px 8px; }
.ph-txt .sub .dot { opacity: .4; }
.ph-txt .sub b { color: var(--ink-2); font-family: var(--mono); }
.ph-actions { display: flex; gap: 10px; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 11px 17px; border-radius: 12px; cursor: pointer; border: 0; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover { filter: brightness(1.04); }
.btn.ghost { background: transparent; color: var(--ink-2); border: 1px solid var(--border); box-shadow: none; }
.btn.ghost:hover { border-color: var(--accent); color: var(--accent); filter: none; }

.meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--pill); font-size: 13px; color: var(--ink-2); font-weight: 500; }
.meta span { display: inline-flex; align-items: center; gap: 6px; }
.meta .desc { color: var(--ink-3); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
.card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: 0 2px 6px rgba(0, 0, 0, .05); opacity: 0; transform: translateY(12px); animation: rise .5s cubic-bezier(.2, .7, .3, 1) forwards; transition: transform .18s cubic-bezier(.2, .7, .3, 1), box-shadow .18s; }
@keyframes rise { to { opacity: 1; transform: none; } }
.card:hover { transform: translateY(-3px); box-shadow: 0 26px 50px -24px color-mix(in srgb, var(--c) 55%, transparent); }
.card.skeleton { height: 220px; animation: none; opacity: 1; transform: none; background: linear-gradient(100deg, var(--card), color-mix(in srgb, var(--ink) 4%, var(--card)), var(--card)); background-size: 200% 100%; animation: shimmer 1.3s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }

.card-head { display: flex; align-items: center; gap: 13px; padding: 16px 16px 14px; background: linear-gradient(180deg, color-mix(in srgb, var(--c) 16%, var(--card)), color-mix(in srgb, var(--c) 5%, var(--card))); border-bottom: 1px solid color-mix(in srgb, var(--c) 16%, var(--border)); }
.glyph { width: 44px; height: 44px; border-radius: 13px; flex: none; display: grid; place-items: center; background: var(--card); box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--c) 50%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--c) 22%, var(--border)); }
.glyph :deep(.demo-logo) { width: 26px; height: 26px; object-fit: contain; }
.glyph :deep(img.tool-icon) { width: 26px; height: 26px; object-fit: contain; }
.glyph :deep(i) { font-size: 24px; color: color-mix(in srgb, var(--c) 75%, var(--ink)); }
.card-head .t { flex: 1; min-width: 0; }
.card-head .name { font-family: var(--font); font-weight: 800; font-size: 16.5px; letter-spacing: -.03em; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-head .kind { font-family: var(--mono); font-size: 11px; font-weight: 700; color: color-mix(in srgb, var(--c) 55%, var(--ink-3)); text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.count { font-family: var(--mono); font-size: 12.5px; font-weight: 700; color: color-mix(in srgb, var(--c) 65%, var(--ink)); background: var(--card); border: 1px solid color-mix(in srgb, var(--c) 22%, var(--border)); border-radius: 9px; padding: 5px 9px; white-space: nowrap; }
.count small { opacity: .5; }

.rows { padding: 8px 12px; min-height: 52px; }
.row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 11px; transition: background .12s; }
.row:hover { background: color-mix(in srgb, var(--c) 8%, var(--card)); }
.row + .row { box-shadow: inset 0 1px 0 var(--border); }
.st { width: 9px; height: 9px; border-radius: 50%; flex: none; position: relative; }
.st::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; background: currentColor; opacity: .18; }
.st.ok { background: var(--ok); color: var(--ok); } .st.warn { background: var(--warn); color: var(--warn); } .st.err { background: var(--err); color: var(--err); } .st.idle { background: var(--idle); color: var(--idle); }
.row .rn { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pills { display: flex; gap: 5px; flex: none; }
.pill { font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--ink-2); background: var(--pill); border: 1px solid var(--border); border-radius: 8px; padding: 2px 7px; }
.pill.cost { color: #b85b00; background: #fff3e6; border-color: #ffe0bf; }
.rowmore { font-size: 12px; font-weight: 700; color: var(--ink-3); padding: 6px 8px 2px; }

.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 16px 14px; }
.morelink { font-size: 12.5px; font-weight: 800; color: color-mix(in srgb, var(--c) 55%, var(--ink)); cursor: pointer; }
.health { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--ink-3); }
.barh { width: 80px; height: 7px; border-radius: 5px; background: var(--pill); overflow: hidden; }
.barh i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 60%, white)); }

.empty { padding: 70px 0; text-align: center; color: var(--ink-3); font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.empty p { margin: 0; }

.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(16px); background: var(--ink); color: var(--surface); padding: 11px 18px; border-radius: 12px; font-weight: 700; font-size: 14px; z-index: 60; opacity: 0; transition: .25s; pointer-events: none; box-shadow: 0 12px 30px -10px rgba(0, 0, 0, .5); }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
