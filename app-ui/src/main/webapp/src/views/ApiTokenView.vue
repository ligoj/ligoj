<!--
  ApiTokenView — 2026 "Vibrant" API token manager (API → Tokens). Ports
  plugin-ui's ApiTokenView logic (rest/api/token list of names; POST creates and
  returns the secret; GET shows it; PUT regenerates; DELETE revokes) onto the
  Vibrant chrome: breadcrumb-chip header, a usage explainer card, KPI stat, a
  VibrantDataTable with a key glyph and show / regenerate / revoke row actions,
  plus Vibrant modals for create, the freshly-minted value, show/regenerate and
  a confirm dialog for revocation. The secret is shown in a copyable box.
-->
<template>
  <div class="tokens">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb"><v-icon size="13">mdi-api</v-icon>{{ t('api.title') }}</span><span class="csep">›</span><span class="crumb cur">{{ t('system.apiToken.title') }}</span></nav>
        <h1>{{ t('system.apiToken.title') }}</h1>
        <p class="sub"><b>{{ rows.length }}</b> {{ t('system.apiToken.countLabel') }}</p>
      </div>
      <div class="ph-actions">
        <div class="search">
          <v-icon size="17" class="search-ic">mdi-magnify</v-icon>
          <input v-model="query" type="text" :placeholder="t('system.apiToken.searchPlaceholder')" />
          <button v-if="query" class="search-x" @click="query = ''"><v-icon size="15">mdi-close</v-icon></button>
        </div>
        <button class="btn" @click="openCreate"><v-icon size="18">mdi-plus</v-icon>{{ t('system.apiToken.new') }}</button>
      </div>
    </header>

    <!-- Usage explainer. -->
    <div class="usage">
      <span class="us-ic"><v-icon size="20">mdi-key-chain-variant</v-icon></span>
      <div class="us-body">
        <p class="us-intro">{{ t('system.apiToken.intro') }}</p>
        <code class="us-ex">GET {{ origin }}{{ base }}rest/project?api-key=&lt;token&gt;&amp;api-user={{ userName }}</code>
      </div>
    </div>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

    <VibrantDataTable :headers="headers" :items="filtered" :items-length="filtered.length" :loading="loading" item-value="name" default-sort="name"
      :empty-text="t('system.apiToken.empty')" @row-click="(item) => openShow(item.name, 'load')">
      <template #cell.name="{ item }">
        <div class="avatar-cell">
          <span class="kglyph"><v-icon size="18">mdi-key-variant</v-icon></span>
          <code class="kname">{{ item.name }}</code>
        </div>
      </template>
      <template #actions="{ item }">
        <button class="iconbtn" @click.stop="openShow(item.name, 'load')">
          <v-icon size="18">mdi-eye-outline</v-icon>
          <v-tooltip activator="parent" :text="t('system.apiToken.show')" location="top" />
        </button>
        <button class="iconbtn" @click.stop="openShow(item.name, 'regen')">
          <v-icon size="18">mdi-refresh</v-icon>
          <v-tooltip activator="parent" :text="t('system.apiToken.regenerate')" location="top" />
        </button>
        <button class="iconbtn danger" @click.stop="startDelete(item.name)">
          <v-icon size="18">mdi-delete-outline</v-icon>
          <v-tooltip activator="parent" :text="t('system.apiToken.revoke')" location="top" />
        </button>
      </template>
    </VibrantDataTable>

    <!-- Create dialog. -->
    <v-dialog v-model="createDialog" max-width="480">
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">mdi-key</v-icon></span>
          <h3>{{ t('system.apiToken.newTitle') }}</h3>
          <button class="x" :aria-label="t('common.cancel')" @click="createDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <v-card-text class="vmodal-body">
          <v-form ref="createFormRef" @submit.prevent="doCreate">
            <v-text-field v-model="createName" prepend-inner-icon="mdi-key-outline" :label="t('system.apiToken.fieldName')" :rules="[rules.required]" variant="outlined" autofocus maxlength="250" />
          </v-form>
        </v-card-text>
        <div class="vmodal-foot">
          <span class="foot-sp" />
          <button class="mbtn ghost" @click="createDialog = false">{{ t('common.cancel') }}</button>
          <button class="mbtn primary" :disabled="creating" @click="doCreate">
            <span v-if="creating" class="mspin" aria-hidden="true" /><v-icon v-else size="18">mdi-plus</v-icon>{{ t('system.apiToken.create') }}
          </button>
        </div>
      </v-card>
    </v-dialog>

    <!-- Freshly-created token value. -->
    <v-dialog v-model="createdDialog" max-width="540">
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">mdi-key-plus</v-icon></span>
          <h3>{{ t('system.apiToken.newTokenLabel') }} <code class="hcode">{{ createdName }}</code></h3>
          <button class="x" :aria-label="t('common.close')" @click="createdDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <v-card-text class="vmodal-body">
          <p class="hint"><v-icon size="16">mdi-information-outline</v-icon>{{ t('system.apiToken.newSaveHint', { showLabel: t('system.apiToken.show') }) }}</p>
          <div class="secret"><code>{{ createdValue }}</code><button class="copy" :title="t('common.copy') || 'Copier'" @click="doCopy(createdValue)"><v-icon size="16">mdi-content-copy</v-icon></button></div>
        </v-card-text>
        <div class="vmodal-foot">
          <span class="foot-sp" />
          <button class="mbtn primary" @click="createdDialog = false">{{ t('system.apiToken.done') }}</button>
        </div>
      </v-card>
    </v-dialog>

    <!-- Show / regenerate token value. -->
    <v-dialog v-model="tokenDialog" max-width="540">
      <v-card class="vmodal">
        <div class="vmodal-head">
          <span class="mi"><v-icon color="#fff">mdi-key</v-icon></span>
          <h3>{{ t('system.apiToken.tokenLabel') }} <code class="hcode">{{ tokenTarget }}</code></h3>
          <button class="x" :aria-label="t('common.close')" @click="tokenDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <v-card-text class="vmodal-body">
          <div class="secret" :class="{ loading: tokenLoading }">
            <span v-if="tokenLoading" class="mspin sm dark" aria-hidden="true" />
            <code v-else>{{ tokenValue }}</code>
            <button v-if="!tokenLoading" class="copy" :title="t('common.copy') || 'Copier'" @click="doCopy(tokenValue, true)"><v-icon size="16">mdi-content-copy</v-icon></button>
          </div>
          <p v-if="copyDone" class="copied"><v-icon size="15">mdi-check-circle</v-icon>{{ t('system.apiToken.copyDone') }}</p>
        </v-card-text>
        <div class="vmodal-foot">
          <span class="foot-sp" />
          <button class="mbtn ghost" @click="tokenDialog = false">{{ t('common.close') || 'Fermer' }}</button>
        </div>
      </v-card>
    </v-dialog>

    <LigojConfirmDialog v-model="deleteDialog" :title="t('system.apiToken.deleteTitle')" icon="mdi-key-remove" confirm-color="error" :confirm-label="t('system.apiToken.revoke')" :loading="deleting" @confirm="confirmDelete">
      {{ t('system.apiToken.deleteConfirmBefore') }}<strong class="text-error">{{ deleteTarget }}</strong>{{ t('system.apiToken.deleteConfirmAfter') }}
    </LigojConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi, useAppStore, useAuthStore, useI18nStore, useClipboard, APP_BASE } from '@ligoj/host'
import VibrantDataTable from '@/components/VibrantDataTable.vue'
import LigojConfirmDialog from '@/components/VibrantConfirmDialog.vue'

const api = useApi()
const app = useAppStore()
const auth = useAuthStore()
const i18n = useI18nStore()
const t = i18n.t
const { copy } = useClipboard()

const base = APP_BASE
const origin = typeof window !== 'undefined' ? window.location.origin : ''
const userName = computed(() => auth.userName || '<you>')

const rows = ref([])
const loading = ref(false)
const error = ref(null)
const query = ref('')

const headers = computed(() => [
  { key: 'name', label: t('system.apiToken.headerName'), sortable: true, icon: 'mdi-key-outline' },
])
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? rows.value.filter((r) => r.name.toLowerCase().includes(q)) : rows.value
})

const rules = { required: (v) => !!v || (t('common.required') || 'Required') }

const createDialog = ref(false)
const createFormRef = ref(null)
const createName = ref('')
const creating = ref(false)

const createdDialog = ref(false)
const createdName = ref('')
const createdValue = ref('')

const tokenDialog = ref(false)
const tokenTarget = ref('')
const tokenValue = ref('')
const tokenLoading = ref(false)
const copyDone = ref(false)

const deleteDialog = ref(false)
const deleteTarget = ref('')
const deleting = ref(false)

async function load() {
  loading.value = true; error.value = null
  try {
    const data = await api.get('rest/api/token')
    rows.value = Array.isArray(data) ? data.map((name) => ({ name })) : []
  } catch { error.value = t('common.loadError') || 'Load error' }
  loading.value = false
}

function openCreate() { createName.value = ''; createDialog.value = true }
async function doCreate() {
  const { valid } = await createFormRef.value.validate()
  if (!valid) return
  creating.value = true
  try {
    const result = await api.post(`rest/api/token/${encodeURIComponent(createName.value)}`)
    if (result === null) return
    createdName.value = createName.value
    createdValue.value = typeof result === 'string' ? result : result?.id || ''
    createDialog.value = false
    createdDialog.value = true
    load()
  } finally { creating.value = false }
}

async function openShow(name, mode) {
  tokenTarget.value = name
  tokenValue.value = ''
  copyDone.value = false
  tokenDialog.value = true
  tokenLoading.value = true
  try {
    const url = `rest/api/token/${encodeURIComponent(name)}`
    const data = mode === 'regen' ? await api.put(url) : await api.get(url)
    tokenValue.value = typeof data === 'string' ? data : data?.id || ''
  } finally { tokenLoading.value = false }
}

async function doCopy(value, flag) {
  if (!value) return
  copy(value)
  if (flag) { copyDone.value = true; setTimeout(() => { copyDone.value = false }, 2000) }
}

function startDelete(name) { deleteTarget.value = name; deleteDialog.value = true }
async function confirmDelete() {
  deleting.value = true
  try {
    await api.del(`rest/api/token/${encodeURIComponent(deleteTarget.value)}`)
    deleteDialog.value = false
    load()
  } finally { deleting.value = false }
}

onMounted(() => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('api.title'), to: '/api' }, { title: t('system.apiToken.title') }], { refresh: load })
  load()
})
</script>

<style scoped>
.tokens {
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
.search { display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; height: 42px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); min-width: 230px; transition: border-color .15s; }
.search:focus-within { border-color: var(--border-2); }
.search-ic { color: var(--ink-3); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-family: var(--font); font-size: 13.5px; font-weight: 500; min-width: 0; }
.search input::placeholder { color: var(--ink-3); }
.search-x { border: 0; background: transparent; cursor: pointer; color: var(--ink-3); display: grid; place-items: center; padding: 2px; border-radius: 6px; }
.search-x:hover { color: var(--ink); background: var(--hover); }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 16px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover { filter: brightness(1.04); }

.usage { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; border: 1px solid var(--border); border-radius: 16px; background: var(--card); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); margin-bottom: 18px; }
.us-ic { width: 42px; height: 42px; border-radius: 12px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #8b5cf6, #6d28d9); box-shadow: 0 8px 18px -8px rgba(139, 92, 246, .55); }
.us-body { min-width: 0; flex: 1; }
.us-intro { margin: 0 0 8px; font-size: 13.5px; color: var(--ink-2); font-weight: 500; line-height: 1.5; }
.us-ex { display: block; font-family: var(--mono); font-size: 12px; color: var(--ink-2); background: var(--pill); padding: 9px 12px; border-radius: 9px; overflow-x: auto; white-space: nowrap; }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

.avatar-cell { display: flex; align-items: center; gap: 12px; }
.kglyph { width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; background: rgba(139, 92, 246, .13); color: #8b5cf6; }
.kname { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--ink); }
.iconbtn { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-3); transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--hover); color: var(--ink); }
.iconbtn.danger:hover { background: rgba(var(--v-theme-error), .1); color: rgb(var(--v-theme-error)); }

/* Modals (Vibrant). Vars re-declared on .vmodal for the teleported card. */
.vmodal {
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
  border-radius: 20px !important; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important;
}
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 19px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.hcode { font-family: var(--mono); font-size: 14px; font-weight: 600; color: var(--accent); background: rgba(var(--v-theme-secondary), .12); padding: 2px 8px; border-radius: 7px; overflow: hidden; text-overflow: ellipsis; }
.vmodal-head .x { width: 36px; height: 36px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); flex: none; }
.vmodal-head .x:hover { background: var(--hover); color: var(--ink); }
.vmodal-body { padding: 14px 24px 4px !important; }
.vmodal :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.vmodal :deep(.v-field__prepend-inner .v-icon) { opacity: .55; }
.hint { display: flex; align-items: flex-start; gap: 7px; margin: 0 0 12px; font-size: 12.5px; font-weight: 500; color: var(--ink-2); background: rgba(47, 109, 246, .1); padding: 9px 12px; border-radius: 10px; }
.hint :deep(.v-icon) { color: #2f6df6; flex: none; margin-top: 1px; }
.secret { display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--pill); }
.secret code { flex: 1; font-family: var(--mono); font-size: 13px; color: var(--ink); word-break: break-all; line-height: 1.5; }
.secret .copy { flex: none; }
.copy { border: 0; background: transparent; cursor: pointer; color: var(--ink-3); display: inline-grid; place-items: center; padding: 6px; border-radius: 8px; }
.copy:hover { color: var(--accent); background: var(--hover); }
.copied { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 12.5px; font-weight: 600; color: #1d9d63; }
.copied :deep(.v-icon) { color: #1d9d63; }
.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 16px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn.ghost:hover { background: var(--hover); border-color: var(--border-2); }
.mbtn:disabled { opacity: .6; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: sspin .7s linear infinite; }
.mspin.sm.dark { width: 18px; height: 18px; border-color: var(--border-2); border-top-color: var(--accent); }
@keyframes sspin { to { transform: rotate(360deg); } }
</style>
