<!--
  DashboardView — 2026 "Vibrant" home, faithful to the validated mockup
  (design/ligoj-2026-prototype.html → viewHome): page header + 4 KPI cards, a
  toolbar (Cards/List · Functional/Technical · search · count) and a grid of
  tool cards (branded glyph, name + kind, total/active counter, subscription
  rows, health bar) or a list table.

  REAL data first: a single `rest/project?rows=100` call returns the projects
  WITH their subscriptions (each carrying its node), so we aggregate them by
  tool (node) into the cards — real logos via the host's NodeIcon. When the
  backend has no subscriptions (empty dev DB) we fall back to the mockup's demo
  dataset, flagged "Aperçu". Card chrome reused from ProjectDetailView.
-->
<template>
  <div class="dash">
    <header class="ph">
      <div class="ph-txt">
        <nav v-if="isDemo" class="crumbs"><span class="crumb cur"><v-icon size="13">mdi-flask-outline</v-icon>Aperçu</span></nav>
        <h1>Tableau de bord</h1>
        <p class="sub">Bonjour <b>{{ auth.userName || 'invité' }}</b> — <span v-if="isDemo"><b>{{ attention }}</b> outils demandent votre attention.</span><span v-else><b>{{ tools.length }}</b> outils configurés sur <b>{{ projectsTotal }}</b> projets.</span></p>
      </div>
      <div class="kpis">
        <div v-for="k in kpis" :key="k.l" class="kpi" :style="{ '--a': k.c }">
          <div class="kpi-ic"><v-icon size="18">{{ k.icon }}</v-icon></div>
          <div class="kpi-b"><div class="v">{{ k.v }}</div><div class="l">{{ k.l }}</div></div>
        </div>
      </div>
    </header>

    <div class="toolbar">
      <div class="seg">
        <button :class="{ on: view === 'cards' }" @click="view = 'cards'"><v-icon size="15">mdi-view-grid-outline</v-icon>Cartes</button>
        <button :class="{ on: view === 'list' }" @click="view = 'list'"><v-icon size="15">mdi-format-list-bulleted</v-icon>Liste</button>
      </div>
      <div class="seg">
        <button :class="{ on: cat === 'func' }" @click="cat = 'func'">Fonctionnel</button>
        <button :class="{ on: cat === 'tech' }" @click="cat = 'tech'">Technique</button>
      </div>
      <label class="search">
        <v-icon size="17">mdi-magnify</v-icon>
        <input v-model="query" type="text" placeholder="Rechercher un projet ou un outil…" />
        <button v-if="query" class="search-x" @click="query = ''"><v-icon size="15">mdi-close</v-icon></button>
      </label>
      <span class="tb-sp" />
      <span class="tcount"><b>{{ filtered.length }}</b> outils · <b>{{ activeSum.toLocaleString('fr-FR') }}</b> souscriptions{{ isDemo ? ' actives' : '' }}</span>
    </div>

    <!-- Cards -->
    <div v-if="view === 'cards'" class="grid">
      <article v-for="(t, i) in filtered" :key="t.key" class="card" :style="{ '--c': colorOf(t, i), animationDelay: Math.min(i, 12) * 45 + 'ms' }" @click="$router.push('/project')">
        <div class="card-head">
          <span class="glyph" :class="{ noimg: failed.has(t.key) }" :data-letter="t.name[0]">
            <NodeIcon v-if="t.nodeId" :node="{ id: t.nodeId }" />
            <img v-else-if="!failed.has(t.key)" class="tool-logo" :src="toolLogo(t.name)" :alt="t.name" loading="lazy" @error="failed.add(t.key)" />
          </span>
          <div class="t"><div class="name">{{ t.name }}</div><div class="kind">{{ t.kind }}</div></div>
          <div class="count">{{ t.total.toLocaleString('fr-FR') }}<small v-if="t.health != null"> / {{ t.active }}</small></div>
        </div>
        <div class="rows">
          <div v-for="r in t.rows" :key="r.n" class="row">
            <span class="st" :class="r.s" />
            <span class="rn">{{ r.n }}</span>
            <span v-if="r.p.length" class="pills"><span v-for="p in r.p" :key="p" class="pill" :class="{ cost: r.cost }">{{ p }}</span></span>
          </div>
        </div>
        <div class="card-foot">
          <a class="morelink">{{ isDemo ? `Voir les ${t.total.toLocaleString('fr-FR')} →` : 'Ouvrir →' }}</a>
          <span v-if="t.health != null" class="health"><span class="barh"><i :style="{ width: Math.round(t.health * 100) + '%' }" /></span>{{ Math.round(t.health * 100) }}%</span>
          <span v-else class="health"><v-icon size="14">mdi-folder-multiple-outline</v-icon>{{ t.rows.length }}</span>
        </div>
      </article>
    </div>

    <!-- List -->
    <VibrantDataTable v-else :headers="headers" :items="filtered" :items-length="filtered.length" item-value="key" default-sort="name" @row-click="$router.push('/project')">
      <template #cell.name="{ item }">
        <div class="avatar-cell">
          <span class="glyph sm" :class="{ noimg: failed.has(item.key) }" :data-letter="item.name[0]" :style="{ '--c': colorOf(item, 0) }">
            <NodeIcon v-if="item.nodeId" :node="{ id: item.nodeId }" />
            <img v-else-if="!failed.has(item.key)" class="tool-logo" :src="toolLogo(item.name)" :alt="item.name" loading="lazy" @error="failed.add(item.key)" />
          </span>
          <div><div class="ac-name">{{ item.name }}</div><div class="ac-kind">{{ item.kind }}</div></div>
        </div>
      </template>
      <template #cell.cat="{ item }"><span class="catchip" :class="catOf(item)">{{ catOf(item) === 'func' ? 'Fonctionnel' : 'Technique' }}</span></template>
      <template #cell.subs="{ item }"><span class="mono">{{ item.total.toLocaleString('fr-FR') }}</span><span v-if="item.health != null" class="ac-kind"> / {{ item.active }}</span></template>
      <template #cell.health="{ item }">
        <span v-if="item.health != null" class="health" :style="{ '--c': colorOf(item, 0) }"><span class="barh"><i :style="{ width: Math.round(item.health * 100) + '%' }" /></span>{{ Math.round(item.health * 100) }}%</span>
        <span v-else class="ac-kind">{{ item.rows.length }} projet{{ item.rows.length > 1 ? 's' : '' }}</span>
      </template>
    </VibrantDataTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi, useAuthStore, NodeIcon } from '@ligoj/host'
import VibrantDataTable from '@/components/VibrantDataTable.vue'

const api = useApi()
const auth = useAuthStore()

const PALETTE = ['#2563eb', '#d33833', '#15a06a', '#7759c2', '#e6a019', '#0ea5a5', '#db2777', '#7c3aed', '#ff7a18', '#4e9bcd']
const COLORS = { Jira: '#2563eb', Jenkins: '#d33833', LDAP: '#15a06a', SonarQube: '#4e9bcd', Confluence: '#e6a019', 'AWS EC2': '#7cb518', GitLab: '#7759c2', 'Provisioning AWS': '#ff7a18', 'Squash TM': '#e0524a' }
const LOGOS = { Jira: 'logos:jira', Jenkins: 'logos:jenkins', LDAP: 'mdi:folder-account-outline', SonarQube: 'logos:sonarqube', Confluence: 'logos:confluence', 'AWS EC2': 'logos:aws-ec2', GitLab: 'logos:gitlab', 'Provisioning AWS': 'logos:aws', 'Squash TM': 'mdi:clipboard-check-outline' }
const DEMO_CAT = { Jira: 'func', Confluence: 'func', 'Squash TM': 'func', Jenkins: 'tech', SonarQube: 'tech', GitLab: 'tech', 'AWS EC2': 'tech', 'Provisioning AWS': 'tech', LDAP: 'tech' }

const DEMO_TOOLS = [
  { key: 'Jira', name: 'Jira', kind: 'Gestion de tickets', total: 649, active: 576, health: 0.82, cat: 'func', rows: [{ n: 'Airbus — Keycopter', s: 'ok', p: ['38 ouv.', '73 clos'] }, { n: 'ANRU — Agora', s: 'ok', p: ['28 ouv.'] }, { n: 'BNPP — KYC', s: 'warn', p: ['12 ouv.'] }, { n: 'EDF — Consoweb', s: 'ok', p: ['185 clos'] }] },
  { key: 'Jenkins', name: 'Jenkins', kind: 'Intégration continue', total: 292, active: 189, health: 0.61, cat: 'tech', rows: [{ n: 'Airbus — Keycopter', s: 'ok', p: ['#1842'] }, { n: 'BNPP — KYC', s: 'err', p: ['échec'] }, { n: 'EDF — PPA Sonar', s: 'ok', p: ['#77'] }, { n: 'EPO — EPO', s: 'warn', p: ['instable'] }] },
  { key: 'LDAP', name: 'LDAP', kind: 'Annuaire', total: 1896, active: 1167, health: 0.94, cat: 'tech', rows: [{ n: 'gfi-support-lille', s: 'ok', p: ['10 mbr.'] }, { n: 'outils-delivery-core', s: 'ok', p: ['5 mbr.'] }, { n: '3suisses-3s-pt', s: 'ok', p: ['3 mbr.'] }, { n: 'abertis-tareas', s: 'idle', p: ['5 mbr.'] }] },
  { key: 'SonarQube', name: 'SonarQube', kind: 'Qualité de code', total: 84, active: 49, health: 0.7, cat: 'tech', rows: [{ n: 'bnpp-pse-android', s: 'warn', p: ['B'] }, { n: 'BNPP — Accueil iPad', s: 'ok', p: ['A'] }, { n: 'BNPP — KYC', s: 'ok', p: ['A'] }, { n: 'CA — Caroline', s: 'err', p: ['C'] }] },
  { key: 'Confluence', name: 'Confluence', kind: 'Documentation', total: 522, active: 462, health: 0.88, cat: 'func', rows: [{ n: 'Espace — Delivery', s: 'ok', p: ['2.3 k'] }, { n: 'Espace — Archi', s: 'ok', p: ['912'] }, { n: 'Espace — RH', s: 'idle', p: ['144'] }] },
  { key: 'AWS EC2', name: 'AWS EC2', kind: 'Provisioning', total: 177, active: 13, health: 0.55, cat: 'tech', rows: [{ n: 'i-06755957da1276', s: 'ok', p: ['running'] }, { n: 'i-0f9c42a5c54b51', s: 'ok', p: ['running'] }, { n: 'i-0eb8922dcfe39f', s: 'warn', p: ['pending'] }, { n: 'i-0ecb5acac04b50', s: 'err', p: ['stopped'] }] },
  { key: 'GitLab', name: 'GitLab', kind: 'Source & MR', total: 552, active: 224, health: 0.9, cat: 'tech', rows: [{ n: 'platform / core', s: 'ok', p: ['4 MR'] }, { n: 'platform / ui', s: 'ok', p: ['2 MR'] }, { n: 'infra / terraform', s: 'warn', p: ['CI…'] }] },
  { key: 'Provisioning AWS', name: 'Provisioning AWS', kind: 'Coûts cloud', total: 20, active: 8, health: 0.76, cat: 'tech', rows: [{ n: 'Datasync Framework', s: 'ok', p: ['8 CPU', '303 $'], cost: true }, { n: 'Loader SAP GP074', s: 'warn', p: ['428 $'], cost: true }, { n: 'Digitale2 Carto', s: 'ok', p: ['992 $'], cost: true }] },
  { key: 'Squash TM', name: 'Squash TM', kind: 'Tests', total: 178, active: 155, health: 0.8, cat: 'func', rows: [{ n: 'Acoss — Portail KPI', s: 'ok', p: ['120'] }, { n: 'ATR — APS Migration', s: 'ok', p: ['64'] }, { n: 'Bayer — AnimPlus', s: 'warn', p: ['à jour ?'] }] },
]
const DEMO_KPIS = [
  { l: 'Projets', v: '124', c: '#2f6df6', icon: 'mdi-folder-multiple-outline' },
  { l: 'Outils', v: '18', c: '#1d9d63', icon: 'mdi-hammer-wrench' },
  { l: 'Souscriptions', v: '2 348', c: '#8b5cf6', icon: 'mdi-connection' },
  { l: 'Utilisateurs', v: '342', c: '#d9701a', icon: 'mdi-account-multiple-outline' },
]

/* --- real data: aggregate projects' subscriptions by tool (node) --- */
const projects = ref([])
const projectsTotal = ref(0)
const usersTotal = ref(0)
async function load() {
  try {
    const data = await api.get('rest/project?rows=100&page=1&sidx=name&sord=asc')
    const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
    projects.value = rows
    projectsTotal.value = data?.recordsTotal ?? rows.length
  } catch { projects.value = [] }

  try {
    const u = await api.get('rest/system/user?rows=1&page=1')
    usersTotal.value = u?.recordsTotal ?? (Array.isArray(u?.data) ? u.data.length : 0)
  } catch { usersTotal.value = 0 }
}
// Functional service families (identity, knowledge, bug/ticket, test mgmt);
// everything else (build, scm, qa, prov…) reads as technical.
function classify(id) { return /:(id|km|bt|tm|ticket|issue|build\/confluence)/i.test(id || '') ? 'func' : 'tech' }

const realTools = computed(() => {
  const byNode = new Map()
  for (const p of projects.value) {
    const subs = Array.isArray(p.subscriptions) ? p.subscriptions : []
    for (const s of subs) {
      const node = s?.node || {}
      const id = node.id || node.name
      if (!id) continue
      if (!byNode.has(id)) byNode.set(id, { id, name: node.name || id, projects: [], count: 0 })
      const e = byNode.get(id)
      e.count++
      const pn = p.name || p.pkey
      if (pn && !e.projects.includes(pn)) e.projects.push(pn)
    }
  }
  const arr = [...byNode.values()]
  if (!arr.length) return null
  return arr.sort((a, b) => b.count - a.count).map((e) => ({
    key: e.id, name: e.name, kind: e.id, nodeId: e.id, cat: classify(e.id),
    total: e.count, active: e.count, health: null,
    rows: e.projects.slice(0, 4).map((n) => ({ n, s: 'idle', p: [] })),
  }))
})

const isDemo = computed(() => !realTools.value)
const tools = computed(() => realTools.value || DEMO_TOOLS)
const kpis = computed(() => {
  if (isDemo.value) return DEMO_KPIS
  const subsTotal = realTools.value.reduce((a, t) => a + t.total, 0)
  return [
    { l: 'Projets', v: projectsTotal.value.toLocaleString('fr-FR'), c: '#2f6df6', icon: 'mdi-folder-multiple-outline' },
    { l: 'Outils', v: realTools.value.length, c: '#1d9d63', icon: 'mdi-hammer-wrench' },
    { l: 'Souscriptions', v: subsTotal.toLocaleString('fr-FR'), c: '#8b5cf6', icon: 'mdi-connection' },
    { l: 'Utilisateurs', v: usersTotal.value.toLocaleString('fr-FR'), c: '#d9701a', icon: 'mdi-account-multiple-outline' },
  ]
})

const view = ref('cards')
const cat = ref('func')
const query = ref('')
const failed = ref(new Set())

function catOf(t) { return t.cat || DEMO_CAT[t.name] || 'tech' }
function colorOf(t, i) { return COLORS[t.name] || PALETTE[i % PALETTE.length] }
function toolLogo(name) {
  const icon = LOGOS[name]
  if (!icon) return ''
  const tint = icon.startsWith('logos:') ? '' : ('&color=' + encodeURIComponent((COLORS[name] || '#888').replace('#', '%23')))
  return `https://api.iconify.design/${icon}.svg?height=26${tint}`
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return tools.value.filter((t) => catOf(t) === cat.value)
    .filter((t) => !q || t.name.toLowerCase().includes(q) || (t.kind || '').toLowerCase().includes(q) || t.rows.some((r) => r.n.toLowerCase().includes(q)))
})
const activeSum = computed(() => filtered.value.reduce((a, t) => a + (t.active ?? t.total), 0))
const attention = computed(() => DEMO_TOOLS.filter((t) => t.rows.some((r) => r.s === 'err')).length)

const headers = [
  { key: 'name', label: 'Outil', sortable: true, icon: 'mdi-hammer-wrench' },
  { key: 'cat', label: 'Catégorie', sortable: false, align: 'center', icon: 'mdi-shape-outline' },
  { key: 'subs', label: 'Souscriptions', sortable: true, align: 'center', icon: 'mdi-connection' },
  { key: 'health', label: 'Santé', sortable: false, align: 'end', icon: 'mdi-heart-pulse' },
]

onMounted(load)
</script>

<style scoped>
.dash {
  --card: rgb(var(--v-theme-surface));
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --ok: #1d9d63; --warn: #d9701a; --err: #df4d42; --idle: #9aa0a6;
  --radius: 18px;
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; flex-wrap: wrap; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
.crumbs { margin-bottom: 8px; }
.crumb { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font); font-size: 11.5px; font-weight: 700; color: var(--accent); background: rgba(var(--v-theme-secondary), .12); border-radius: 999px; padding: 3px 10px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.035em; font-size: 30px; margin: 0; }
.ph-txt .sub { margin: 5px 0 0; font-size: 14.5px; color: var(--ink-3); font-weight: 500; }
.ph-txt .sub b { color: var(--ink-2); }
.kpis { display: flex; gap: 12px; flex-wrap: wrap; }
.kpi { display: flex; align-items: center; gap: 11px; padding: 12px 16px; border-radius: 16px; border: 1px solid var(--border); background: linear-gradient(135deg, color-mix(in srgb, var(--a) 10%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0,0,0,.04); min-width: 132px; }
.kpi-ic { width: 38px; height: 38px; border-radius: 11px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--a), color-mix(in srgb, var(--a) 70%, #000)); box-shadow: 0 8px 16px -8px color-mix(in srgb, var(--a) 65%, transparent); }
.kpi .v { font-family: var(--mono); font-weight: 700; font-size: 22px; line-height: 1; color: var(--ink); }
.kpi .l { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); margin-top: 3px; }

.toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.seg { display: inline-flex; background: var(--pill); border: 1px solid var(--border); border-radius: 12px; padding: 3px; gap: 2px; }
.seg button { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); font-weight: 700; font-size: 13px; color: var(--ink-3); background: transparent; border: 0; border-radius: 9px; padding: 7px 13px; cursor: pointer; transition: color .15s, background .15s, box-shadow .15s; }
.seg button:hover { color: var(--ink); }
.seg button.on { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 6px 14px -8px rgba(255,90,82,.6); }
.search { display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; height: 42px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); min-width: 240px; flex: 1; max-width: 360px; transition: border-color .15s; }
.search:focus-within { border-color: var(--border-2); }
.search .v-icon { color: var(--ink-3); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-family: var(--font); font-size: 13.5px; font-weight: 500; min-width: 0; }
.search input::placeholder { color: var(--ink-3); }
.search-x { border: 0; background: transparent; cursor: pointer; color: var(--ink-3); display: grid; place-items: center; padding: 2px; border-radius: 6px; }
.search-x:hover { color: var(--ink); background: var(--hover); }
.tb-sp { flex: 1; }
.tcount { font-size: 13px; font-weight: 500; color: var(--ink-3); }
.tcount b { color: var(--ink-2); font-family: var(--mono); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
.card { position: relative; display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,.05); cursor: pointer; opacity: 0; transform: translateY(12px); animation: rise .5s cubic-bezier(.2,.7,.3,1) forwards; transition: transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s; }
@keyframes rise { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .card { animation: none; opacity: 1; transform: none; } }
.card:hover { transform: translateY(-3px); box-shadow: 0 26px 50px -24px color-mix(in srgb, var(--c) 55%, transparent); }
.card-head { display: flex; align-items: center; gap: 13px; padding: 16px 16px 14px; background: linear-gradient(180deg, color-mix(in srgb, var(--c) 16%, var(--card)), color-mix(in srgb, var(--c) 5%, var(--card))); border-bottom: 1px solid color-mix(in srgb, var(--c) 16%, var(--border)); }
.glyph { width: 44px; height: 44px; border-radius: 13px; flex: none; display: grid; place-items: center; background: var(--card); box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--c) 50%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--c) 22%, var(--border)); }
.glyph.sm { width: 36px; height: 36px; border-radius: 11px; }
.glyph .tool-logo, .glyph :deep(img.tool-icon) { width: 26px; height: 26px; object-fit: contain; }
.glyph.sm .tool-logo, .glyph.sm :deep(img.tool-icon) { width: 22px; height: 22px; }
.glyph :deep(i) { font-size: 24px; color: color-mix(in srgb, var(--c) 75%, var(--ink)); }
.glyph.noimg::after { content: attr(data-letter); font-family: var(--font); font-weight: 800; font-size: 20px; color: color-mix(in srgb, var(--c) 75%, var(--ink)); }
.card-head .t { flex: 1; min-width: 0; }
.card-head .name { font-family: var(--font); font-weight: 800; font-size: 16.5px; letter-spacing: -.03em; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-head .kind { font-family: var(--mono); font-size: 11px; font-weight: 700; color: color-mix(in srgb, var(--c) 55%, var(--ink-3)); text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.count { font-family: var(--mono); font-size: 12.5px; font-weight: 700; color: color-mix(in srgb, var(--c) 65%, var(--ink)); background: var(--card); border: 1px solid color-mix(in srgb, var(--c) 22%, var(--border)); border-radius: 9px; padding: 5px 9px; white-space: nowrap; }
.count small { opacity: .5; }
.rows { flex: 1; padding: 8px 12px; }
.row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 11px; transition: background .12s; }
.row:hover { background: color-mix(in srgb, var(--c) 8%, var(--card)); }
.row + .row { box-shadow: inset 0 1px 0 var(--border); }
.st { width: 9px; height: 9px; border-radius: 50%; flex: none; position: relative; }
.st::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; background: currentColor; opacity: .18; }
.st.ok { background: var(--ok); color: var(--ok); } .st.warn { background: var(--warn); color: var(--warn); } .st.err { background: var(--err); color: var(--err); } .st.idle { background: var(--idle); color: var(--idle); }
.row .rn { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pills { display: flex; gap: 5px; flex: none; }
.pill { font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--ink-2); background: var(--pill); border: 1px solid var(--border); border-radius: 8px; padding: 2px 7px; }
.pill.cost { color: #b85b00; background: rgba(255,153,0,.12); border-color: rgba(255,153,0,.3); }
.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 16px 14px; }
.morelink { font-size: 12.5px; font-weight: 800; color: color-mix(in srgb, var(--c) 55%, var(--ink)); cursor: pointer; }
.health { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--ink-3); }
.barh { width: 80px; height: 7px; border-radius: 5px; background: var(--pill); overflow: hidden; }
.barh i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 60%, white)); }

.avatar-cell { display: flex; align-items: center; gap: 12px; }
.ac-name { font-family: var(--font); font-weight: 700; font-size: 14px; color: var(--ink); }
.ac-kind { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
.catchip { font-family: var(--font); font-weight: 700; font-size: 11px; padding: 3px 10px; border-radius: 999px; }
.catchip.func { color: #2f6df6; background: rgba(47,109,246,.13); }
.catchip.tech { color: #d9701a; background: rgba(217,112,26,.14); }
.mono { font-family: var(--mono); }
</style>
