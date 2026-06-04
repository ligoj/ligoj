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

    <VibrantDataTable :headers="headers" :items="filtered" :items-length="filtered.length" :loading="loading" item-value="id" :empty-text="t('common.noData') || 'Aucune donnée'"
      @row-click="openProject">
      <template #cell.name="{ item }">
        <div class="name-cell">
          <div class="folder-glyph"><v-icon color="#2f6df6" size="20">mdi-folder</v-icon></div>
          <div class="name-stack">
            <div class="name-main">{{ item.name }}</div>
            <div class="name-key">{{ item.pkey }}</div>
          </div>
        </div>
      </template>
      <template #cell.teamLeader="{ item }">
        <span v-if="item.teamLeader" class="tl-pill"><v-icon size="14">mdi-account-circle</v-icon>{{ item.teamLeader }}</span>
        <span v-else class="muted">—</span>
      </template>
      <template #cell.createdDate="{ item }">
        <span v-if="item.createdDate" class="mono">{{ fmtDate(item.createdDate) }}</span>
        <span v-else class="muted">—</span>
      </template>
      <template #cell.subs="{ item }">
        <span class="subs-chip">{{ item.subs }}</span>
      </template>
      <template #cell.actions="{ item }">
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

    <ProjectEditDialog v-model="editDialog" :project="editTarget" @saved="onSaved" />

    <VibrantConfirmDialog v-model="deleteDialog" :title="t('project.deleteTitle') || 'Supprimer le projet'" icon="mdi-folder-remove" confirm-color="error" :confirm-label="t('common.delete')"
      :loading="deleting" @confirm="confirmDelete">
      <span>{{ t('project.deleteConfirm', { name: deleteTarget?.name }) || `Supprimer le projet « ${deleteTarget?.name} » ?` }}</span>
    </VibrantConfirmDialog>

    <div class="toast" :class="{ show: toastMsg }">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, useAppStore, useI18nStore } from '@ligoj/host'
import ProjectEditDialog from '@/views/ProjectEditDialog.vue'
import VibrantDataTable from '@/components/VibrantDataTable.vue'
import VibrantConfirmDialog from '@/components/VibrantConfirmDialog.vue'

const router = useRouter()
const api = useApi()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

/* Sample projects from the validated mockup — shown when the backend has
   none, so the cockpit is never empty in the preview. */
const DEMO_PROJECTS = [
  { pkey: 'bnpp-kyc', name: 'BNPP — KYC', description: 'Customer KYC orchestration', teamLeader: 'Aïcha Dubois', createdDate: '2024-03-12', tools: ['Jira', 'Jenkins', 'SonarQube', 'GitLab'], subs: 14, health: .78 },
  { pkey: 'airbus-keycopter', name: 'Airbus — Keycopter', description: 'Rotor telemetry platform', teamLeader: 'Julien Mercier', createdDate: '2024-06-28', tools: ['Jira', 'Jenkins', 'Confluence'], subs: 9, health: .9 },
  { pkey: 'edf-consoweb', name: 'EDF — Consoweb', description: 'Energy consumption portal', teamLeader: 'Sophie Lefèvre', createdDate: '2024-09-04', tools: ['Jira', 'SonarQube', 'LDAP'], subs: 11, health: .84 },
  { pkey: 'datasync-fw', name: 'Datasync Framework', description: 'Cross-cloud data sync toolkit', teamLeader: 'Karim Benali', createdDate: '2025-01-17', tools: ['Provisioning AWS', 'AWS EC2', 'GitLab'], subs: 7, health: .66 },
  { pkey: 'acoss-kpi', name: 'Acoss — Portail KPI', description: 'Indicator reporting dashboard', teamLeader: 'Marie Garnier', createdDate: '2025-02-23', tools: ['Squash TM', 'Jira', 'Confluence'], subs: 8, health: .81 },
  { pkey: 'anru-agora', name: 'ANRU — Agora', description: 'Urban renewal collaboration hub', teamLeader: 'Thomas Rousseau', createdDate: '2025-04-09', tools: ['Jira', 'LDAP'], subs: 5, health: .93 },
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

const headers = computed(() => [
  { key: 'name', label: t('common.name'), sortable: true },
  { key: 'description', label: t('common.description'), sortable: false },
  { key: 'teamLeader', label: t('project.teamLeader') || 'Team leader', sortable: true },
  { key: 'createdDate', label: t('common.createdDate') || 'Created', sortable: true },
  { key: 'subs', label: t('project.subsShort'), sortable: true, align: 'center', width: '90px' },
  { key: 'actions', label: '', sortable: false, align: 'end', width: '120px' },
])

/* Map a raw Ligoj project (DataTables row) to the card's shape. */
function mapProject(p) {
  const subs = Array.isArray(p.subscriptions) ? p.subscriptions : []
  const tools = [...new Set(subs.map((s) => s?.node?.name || s?.node?.id || s?.name).filter(Boolean))]
  const leader = p.teamLeader
  return {
    id: p.id, name: p.name, pkey: p.pkey,
    description: p.description || '',
    teamLeader: typeof leader === 'object' ? (leader?.fullName || leader?.id || '') : (leader || ''),
    createdDate: p.createdDate ?? p.creationDate ?? null,
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

function fmtDate(d) {
  if (!d) return ''
  const date = typeof d === 'number' ? new Date(d) : new Date(String(d))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const editDialog = ref(false)
const editTarget = ref(null)
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
function openNew() { editTarget.value = null; editDialog.value = true }
function openEdit(p) { editTarget.value = p; editDialog.value = true }

function startDelete(p) { deleteTarget.value = p; deleteDialog.value = true }
async function confirmDelete() {
  if (!deleteTarget.value) return
  if (demoMode.value) {
    deleteDialog.value = false
    toast(t('project.demoDelete') || 'Aperçu — suppression non persistée')
    return
  }
  deleting.value = true
  try {
    await api.del(`rest/project/${deleteTarget.value.id}`)
    deleteDialog.value = false
    deleteTarget.value = null
    await load()
  } finally { deleting.value = false }
}
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

.ph {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.ph-txt h1 {
  font-family: var(--font);
  font-weight: 800;
  letter-spacing: -.03em;
  font-size: 28px;
  margin: 0;
  color: var(--ink);
}

.ph-txt .sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--ink-3);
  font-weight: 500;
}

.ph-txt .sub b {
  color: var(--ink-2);
  font-family: var(--mono);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font);
  font-weight: 700;
  font-size: 14px;
  padding: 11px 17px;
  border-radius: 12px;
  cursor: pointer;
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #ff9436, #ff5a52);
  box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55);
  transition: filter .15s;
}

.btn:hover {
  filter: brightness(1.04);
}

.toolbar {
  margin-bottom: 18px;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 520px;
  padding: 9px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-3);
  transition: border-color .15s, box-shadow .15s;
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(var(--v-theme-secondary), .15);
}

.search input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--font);
  font-size: 14px;
  color: var(--ink);
}

.search input::placeholder {
  color: var(--ink-3);
}

/* Table cells (folder glyph + name stack, team leader pill, subs chip). */
.name-cell {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.folder-glyph {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, #2f6df6 12%, var(--card));
  box-shadow: 0 2px 6px -3px rgba(47, 109, 246, .35);
  flex: none;
}

.name-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name-main {
  font-family: var(--font);
  font-weight: 800;
  font-size: 14px;
  color: var(--ink);
  letter-spacing: -.02em;
}

.name-key {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: .04em;
}

.tl-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--ink-2);
}

.subs-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--pill);
  font-family: var(--mono);
  font-weight: 700;
  font-size: 12px;
  color: var(--ink-2);
}

.muted {
  color: var(--ink-3);
}

.mono {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink-2);
}

.iconbtn {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  border-radius: 9px;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  color: var(--ink-3);
  transition: background .15s, color .15s;
}

.iconbtn:hover {
  background: var(--hover);
  color: var(--ink);
}

.iconbtn.danger:hover {
  color: rgb(var(--v-theme-error));
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(16px);
  background: var(--ink);
  color: var(--surface);
  padding: 11px 18px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  z-index: 60;
  opacity: 0;
  transition: .25s;
  pointer-events: none;
  box-shadow: 0 12px 30px -10px rgba(0, 0, 0, .5);
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
