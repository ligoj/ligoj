<!--
  SubscribeWizardDialog — 2026 "Vibrant" subscription wizard (subscribe mode
  only; edit-node / create-node belong to the Administration views). Same
  `.vmodal` chrome as the other dialogs, but taller and scrollable. Cascading
  pickers: service → tool → instance (with an optional inline "new instance"
  form), then a segmented mode control, then the node's dynamic parameter
  fields. POSTs rest/subscription on confirm.

  Ported from plugin-ui's SubscribeWizardView. Standalone caveat: plugin
  parameter-field overrides and plugin i18n labels need the plugin bundles
  loaded (install()), which the 2026 app doesn't do — so parameters render
  with the default type-based fields and raw ids as labels. The core flow
  (service/tool/instance/mode/params → subscribe) works against the live
  backend nodes.
-->
<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogModel" max-width="720" scrollable>
    <v-card class="vmodal">
      <div class="vmodal-head">
        <span class="mi"><v-icon color="#fff">mdi-cloud-plus-outline</v-icon></span>
        <h3>{{ t('wizard.title') }}</h3>
        <button class="x" :aria-label="t('common.cancel')" @click="$emit('update:modelValue', false)"><v-icon size="20">mdi-close</v-icon></button>
      </div>

      <v-card-text class="vmodal-body">
        <p v-if="projectName" class="ctx">{{ t('wizard.contextBefore') }} <strong>{{ projectName }}</strong>.</p>
        <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

        <!-- 1. Service -->
        <section class="step">
          <div class="sh"><span class="n">1</span><v-icon size="18">mdi-room-service-outline</v-icon>{{ t('wizard.step.service') }}</div>
          <v-select v-model="selected.service" :items="services" item-title="name" item-value="id" return-object :placeholder="t('wizard.label.service')" :loading="loadingServices"
            variant="outlined" density="comfortable" hide-details>
            <template #selection="{ item }"><span v-if="item" class="opt"><NodeIcon :node="item" /> {{ item.name || item.id }}</span></template>
            <template #item="{ props: ip, item }">
              <v-list-item v-if="item" v-bind="ip" :title="item.name || item.id" :subtitle="item.id">
                <template #prepend><NodeIcon :node="item" class="mr-2" /></template>
              </v-list-item>
            </template>
          </v-select>
        </section>

        <!-- 2. Tool -->
        <section class="step" :class="{ off: !selected.service }">
          <div class="sh"><span class="n">2</span><v-icon size="18">mdi-wrench-outline</v-icon>{{ t('wizard.step.tool') }}</div>
          <v-select v-model="selected.tool" :items="tools" item-title="name" item-value="id" return-object :placeholder="t('wizard.label.tool')" :loading="loadingTools" :disabled="!selected.service"
            variant="outlined" density="comfortable" hide-details>
            <template #selection="{ item }"><span v-if="item" class="opt"><NodeIcon :node="item" /> {{ item.name || item.id }}</span></template>
            <template #item="{ props: ip, item }">
              <v-list-item v-if="item" v-bind="ip" :title="item.name || item.id" :subtitle="item.id">
                <template #prepend><NodeIcon :node="item" class="mr-2" /></template>
              </v-list-item>
            </template>
          </v-select>
        </section>

        <!-- 3. Instance -->
        <section class="step" :class="{ off: !selected.tool }">
          <div class="sh"><span class="n">3</span><v-icon size="18">mdi-server-outline</v-icon>{{ t('wizard.step.instance') }}</div>
          <div class="inst-row">
            <v-select v-model="selected.node" :items="nodes" item-title="name" item-value="id" return-object :placeholder="t('wizard.label.instance')" :loading="loadingNodes"
              :disabled="!selected.tool || showNewNode" variant="outlined" density="comfortable" hide-details class="flex-grow-1">
              <template #selection="{ item }"><span v-if="item" class="opt"><NodeIcon :node="item" /> {{ item.name || item.id }}</span></template>
              <template #item="{ props: ip, item }">
                <v-list-item v-if="item" v-bind="ip" :title="item.name || item.id" :subtitle="item.id">
                  <template #prepend><NodeIcon :node="item" class="mr-2" /></template>
                </v-list-item>
              </template>
            </v-select>
            <button class="mbtn ghost" :disabled="!selected.tool" @click="toggleNewNode">
              <v-icon size="18">{{ showNewNode ? 'mdi-close' : 'mdi-plus' }}</v-icon>{{ showNewNode ? t('wizard.pickExisting') : t('wizard.newInstance') }}
            </button>
          </div>

          <v-expand-transition>
            <div v-if="showNewNode" class="newnode">
              <v-text-field v-model="newNode.id" :label="t('wizard.label.id')" :hint="`${selected.tool?.id || ''}:my-instance`" persistent-hint variant="outlined" density="comfortable" class="mb-2" />
              <v-text-field v-model="newNode.name" :label="t('wizard.label.name')" variant="outlined" density="comfortable" class="mb-2" hide-details />
              <p v-if="newNodeError" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ newNodeError }}</p>
              <button class="mbtn primary sm" :disabled="!newNode.id || !newNode.name || creatingNode" @click="createNode">
                <span v-if="creatingNode" class="mspin" /><v-icon v-else size="16">mdi-plus</v-icon>{{ t('wizard.createInstance') }}
              </button>
            </div>
          </v-expand-transition>
        </section>

        <!-- 4. Mode -->
        <section class="step" :class="{ off: !selected.node }">
          <div class="sh"><span class="n">4</span><v-icon size="18">mdi-link-variant</v-icon>{{ t('wizard.step.mode') }}</div>
          <div class="seg" v-if="availableModes.length">
            <button v-for="m in availableModes" :key="m.value" :class="{ on: selected.mode === m.value }" @click="selected.mode = m.value">
              {{ m.label }}
            </button>
          </div>
          <p v-if="selected.mode" class="modehint">{{ modeHint }}</p>
        </section>

        <!-- 5. Parameters -->
        <section class="step" :class="{ off: !selected.mode }">
          <div class="sh"><span class="n">5</span><v-icon size="18">mdi-tune-variant</v-icon>{{ t('wizard.step.parameters') }}<v-progress-circular v-if="loadingParams" size="13" width="2" indeterminate class="ml-2" /></div>
          <p v-if="!loadingParams && selected.mode && selected.node && !parameters.length" class="muted">{{ t('wizard.params.emptySubscribe') }}</p>
          <div v-for="p in parameters" :key="p.id" class="pfield">
            <!-- Plugin-supplied field (e.g. id-ldap's live group/OU
                 autocomplete) takes precedence over the default type-based
                 rendering — same hook as plugin-ui's wizard. Only resolves
                 when the owning plugin bundle is loaded. -->
            <component v-if="resolveParameterField(p)" :is="resolveParameterField(p)" v-model="paramValues[p.id]" :parameter="p" :form-values="paramValues" :mode="selected.mode"
              :is-node="false" :node-id="selected.tool?.id" :instance-node-id="selected.node?.id" />
            <v-text-field v-else-if="isTextParam(p)" v-model="paramValues[p.id]" :type="isPassword(p) ? 'password' : 'text'" :label="paramLabel(p)" :rules="ruleFor(p)" variant="outlined" density="comfortable" hide-details="auto" />
            <v-text-field v-else-if="typeKind(p) === 'integer'" v-model.number="paramValues[p.id]" type="number" :min="p.min" :max="p.max" :label="paramLabel(p)" :rules="ruleFor(p)" variant="outlined" density="comfortable" hide-details="auto" />
            <v-checkbox v-else-if="typeKind(p) === 'bool'" v-model="paramValues[p.id]" :label="paramLabel(p)" density="comfortable" hide-details />
            <v-select v-else-if="typeKind(p) === 'select'" v-model="paramValues[p.id]" :items="p.values || []" :label="paramLabel(p)" :rules="ruleFor(p)" variant="outlined" density="comfortable" hide-details="auto" />
            <v-select v-else-if="['multiple','multiselect','tags'].includes(typeKind(p))" v-model="paramValues[p.id]" :items="p.values || []" :label="paramLabel(p)" :rules="ruleFor(p)" chips multiple variant="outlined" density="comfortable" hide-details="auto" />
            <v-text-field v-else v-model="paramValues[p.id]" :label="paramLabel(p)" :rules="ruleFor(p)" variant="outlined" density="comfortable" hide-details="auto" />
          </div>
        </section>
      </v-card-text>

      <div class="vmodal-foot">
        <span class="foot-sp" />
        <button class="mbtn ghost" @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</button>
        <button class="mbtn primary" :disabled="!ready || creating" @click="submit">
          <span v-if="creating" class="mspin" /><v-icon v-else size="18">mdi-check</v-icon>{{ t('wizard.action.createSubscription') }}
        </button>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useApi, useErrorStore, useI18nStore, NodeIcon, pluginRegistry, pluginIdFromKey, loadPlugin } from '@ligoj/host'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: null },
  projectName: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const api = useApi()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = (k, p) => i18n.t(k, p)

const selected = reactive({ service: null, tool: null, node: null, mode: null })
const services = ref([])
const tools = ref([])
const nodes = ref([])
const parameters = ref([])
const paramValues = reactive({})

const loadingServices = ref(false)
const loadingTools = ref(false)
const loadingNodes = ref(false)
const loadingParams = ref(false)
const creating = ref(false)
const error = ref(null)

const showNewNode = ref(false)
const newNode = reactive({ id: '', name: '' })
const creatingNode = ref(false)
const newNodeError = ref(null)

const rules = {
  required: (v) => (v != null && v !== '' && (!Array.isArray(v) || v.length > 0)) || t('wizard.rule.required'),
}

/* Modes offered by the picked tool (backend SubscriptionMode: LINK/CREATE/ALL). */
const availableModes = computed(() => {
  const m = String(selected.tool?.mode || '').toLowerCase()
  const out = []
  if (m === 'all' || m === 'create') out.push({ value: 'create', label: t('wizard.modeCreate') })
  if (m === 'all' || m === 'link' || !m) out.push({ value: 'link', label: t('wizard.modeLink') })
  return out
})
const modeHint = computed(() => selected.mode === 'create' ? t('wizard.modeHintCreate') : t('wizard.modeHintLink'))

const ready = computed(() =>
  !!props.projectId && !!selected.service && !!selected.tool && !!selected.node && !!selected.mode && !showNewNode.value)

/* ---- param helpers (ported) ---- */
function typeKind(p) { return String(p?.type || '').toLowerCase() }
function isTextParam(p) { const k = typeKind(p); return !k || ['text', 'password', 'node', 'project'].includes(k) }
function isPassword(p) { return !!p.secured || typeKind(p) === 'password' }
function tOrNull(key) { const v = i18n.t(key); return v === key ? null : v }
function paramLabel(p) { return `${tOrNull(p.id) ?? p.id}${(p.mandatory || p.required) ? ' *' : ''}` }
function ruleFor(p) { return (p.mandatory || p.required) ? [rules.required] : [] }

/* Lazy-load the tool's sub-plugin bundle (e.g. service:id:ldap → id-ldap) so
   its i18n labels and custom parameter fields are available. Best effort. */
async function ensureToolPluginLoaded(nodeId) {
  if (typeof nodeId !== 'string') return
  const pluginId = pluginIdFromKey(nodeId.split(':').filter(Boolean).slice(0, 3).join(':'))
  if (!pluginId || pluginRegistry.has(pluginId)) return
  try {
    await loadPlugin(pluginId)
  } catch {
    // The browser module-map permanently caches a failed dynamic import by
    // URL — so if the bundle 404'd once early (e.g. before the session was
    // ready), the host loader keeps re-importing the same poisoned URL and
    // keeps failing. Retry with a cache-busting query and register the
    // freshly-loaded definition ourselves so its custom parameter fields and
    // i18n resolve. (requires/parents are already loaded at boot.)
    if (pluginRegistry.has(pluginId)) return
    try {
      const url = `${import.meta.env.BASE_URL}main/${pluginId}/vue/index.js?cb=${Date.now()}`
      const def = (await import(/* @vite-ignore */ url))?.default
      if (def && typeof def === 'object') {
        if (!def.id) def.id = pluginId
        pluginRegistry.register(def.id, def)
        if (typeof def.install === 'function') await def.install({ pluginId })
      }
    } catch { /* give up — default fields render */ }
  }
}

/* Ask the owning plugin (sub-plugin first, then parent service plugin) for a
   custom field component for parameter `p`. Returns null when none — the
   default type-based field then renders. Mirrors plugin-ui's wizard. */
function resolveParameterField(p) {
  const nodeId = selected.tool?.id
  if (!nodeId) return null
  const ctx = { parameter: p, mode: selected.mode || null, isNode: false, formValues: paramValues, nodeId, instanceNodeId: selected.node?.id || null }
  const candidates = []
  const sub = pluginIdFromKey(nodeId)
  if (sub) candidates.push(sub)
  const parts = String(nodeId).split(':').filter(Boolean)
  if (parts.length >= 2 && parts[1] && parts[1] !== sub) candidates.push(parts[1])
  for (const id of candidates) {
    const plugin = pluginRegistry.get(id)
    if (typeof plugin?.feature !== 'function') continue
    try {
      const comp = plugin.feature('parameterField', ctx)
      if (comp) return comp
    } catch (err) {
      if (!/no feature ["']parameterField["']/.test(err?.message || '')) console.warn(`[wizard] parameterField from ${id} threw`, err)
    }
  }
  return null
}

/* ---- loaders ---- */
async function fetchNodes(url) {
  const data = await api.get(url)
  const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
  return list.filter((n) => n.enabled !== false)
}
async function loadServices() { loadingServices.value = true; try { services.value = await fetchNodes('rest/node?refined=service&rows=1000') } finally { loadingServices.value = false } }
async function loadTools(id) { loadingTools.value = true; try { tools.value = await fetchNodes(`rest/node?refined=${encodeURIComponent(id)}&rows=1000`) } finally { loadingTools.value = false } }
async function loadNodes(id) { loadingNodes.value = true; try { nodes.value = await fetchNodes(`rest/node?refined=${encodeURIComponent(id)}&rows=1000`) } finally { loadingNodes.value = false } }

async function loadParameters(nodeId, mode) {
  loadingParams.value = true
  // AWAIT the tool's plugin bundle BEFORE assigning parameters, so the
  // registry already holds it when the param fields first render — otherwise
  // resolveParameterField() returns null on first paint and the custom field
  // (e.g. id-ldap's IdGroupField) silently falls back to a plain text field.
  await ensureToolPluginLoaded(selected.tool?.id || nodeId)
  try {
    const data = await api.get(`rest/node/${encodeURIComponent(nodeId)}/parameter/${mode.toUpperCase()}`)
    const raw = Array.isArray(data) ? data : (data?.data || [])
    parameters.value = raw.filter((p) => p && p.availableForSubscription !== false)
    for (const k of Object.keys(paramValues)) delete paramValues[k]
    for (const p of parameters.value) {
      if (p.defaultValue != null) paramValues[p.id] = coerce(p)
      else { const k = typeKind(p); paramValues[p.id] = k === 'bool' ? false : (['multiple', 'multiselect', 'tags'].includes(k) ? [] : '') }
    }
  } finally { loadingParams.value = false }
}
function coerce(p) { const k = typeKind(p); if (k === 'integer') return Number(p.defaultValue); if (k === 'bool') return p.defaultValue === true || p.defaultValue === 'true'; return p.defaultValue }

/* ---- cascading invalidation ---- */
watch(() => selected.service, async (svc) => {
  selected.tool = null; selected.node = null; selected.mode = null
  tools.value = []; nodes.value = []; parameters.value = []
  newNode.id = ''; newNode.name = ''; newNodeError.value = null; showNewNode.value = false
  if (svc) await loadTools(svc.id)
})
watch(() => selected.tool, async (tool) => {
  selected.node = null; selected.mode = null
  nodes.value = []; parameters.value = []
  newNode.id = ''; newNode.name = ''; newNodeError.value = null; showNewNode.value = false
  if (tool) {
    await loadNodes(tool.id)
    const modes = availableModes.value
    if (modes.length === 1) selected.mode = modes[0].value
  }
})
watch([() => selected.node, () => selected.mode], async () => {
  parameters.value = []
  if (!selected.mode || !selected.node) return
  await loadParameters(selected.node.id, selected.mode)
})

/* ---- new instance ---- */
function toggleNewNode() {
  showNewNode.value = !showNewNode.value
  newNodeError.value = null
  if (showNewNode.value) { selected.node = null; if (!newNode.id && selected.tool?.id) newNode.id = `${selected.tool.id}:` }
  else { newNode.id = ''; newNode.name = '' }
}
async function createNode() {
  newNodeError.value = null; creatingNode.value = true
  try {
    const result = await api.post('rest/node', { id: newNode.id, name: newNode.name, node: selected.tool?.id })
    if (result === null) { newNodeError.value = t('wizard.error.newNodeRejected'); return }
    await loadNodes(selected.tool.id)
    const created = nodes.value.find((n) => n.id === newNode.id)
    if (created) selected.node = created
    showNewNode.value = false; newNode.id = ''; newNode.name = ''
  } finally { creatingNode.value = false }
}

/* ---- submit ---- */
function buildParamWire(p) {
  const value = paramValues[p.id]
  if ((value === '' || value == null || (Array.isArray(value) && !value.length)) && !p.mandatory && !p.required) return null
  const base = { parameter: p.id }; const k = typeKind(p)
  if (k === 'integer') return { ...base, integer: Number(value) }
  if (k === 'bool') return { ...base, bool: !!value }
  if (['multiple', 'multiselect', 'tags'].includes(k)) return { ...base, selections: value || [] }
  return { ...base, text: value }
}
async function submit() {
  if (!ready.value) return
  creating.value = true; error.value = null
  try {
    const payload = {
      node: selected.node.id,
      project: Number(props.projectId),
      mode: String(selected.mode).toUpperCase(),
      parameters: parameters.value.map(buildParamWire).filter(Boolean),
    }
    const id = await api.post('rest/subscription', payload)
    if (id != null) {
      errorStore.success(t('wizard.success.subscriptionCreated'))
      emit('saved', { id })
      emit('update:modelValue', false)
    } else {
      error.value = t('wizard.error.subscriptionFailed')
    }
  } finally { creating.value = false }
}

function reset() {
  selected.service = null; selected.tool = null; selected.node = null; selected.mode = null
  tools.value = []; nodes.value = []; parameters.value = []
  for (const k of Object.keys(paramValues)) delete paramValues[k]
  showNewNode.value = false; newNode.id = ''; newNode.name = ''; newNodeError.value = null; error.value = null
}
function onDialogModel(v) { if (!v) emit('update:modelValue', false) }

watch(() => props.modelValue, (val) => {
  if (val) { reset(); if (!services.value.length) loadServices() }
})
</script>

<style scoped>
.vmodal {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .5);
  --border: rgba(var(--v-theme-on-surface), .14);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --surface: rgb(var(--v-theme-surface));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  border-radius: 20px !important;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important;
}
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 20px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; }
.vmodal-head .x { width: 36px; height: 36px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); }
.vmodal-head .x:hover { background: var(--hover); color: var(--ink); }
.vmodal-body { padding: 8px 24px 6px !important; }
.vmodal :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.vmodal :deep(.v-label) { font-weight: 600; }

.ctx { font-size: 13.5px; color: var(--ink-2); margin: 2px 0 14px; }
.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 6px 0; }

.step { padding: 12px 0; border-top: 1px solid var(--border); transition: opacity .2s; }
.step:first-of-type { border-top: 0; }
.step.off { opacity: .45; pointer-events: none; }
.sh { display: flex; align-items: center; gap: 9px; font-family: var(--font); font-weight: 700; font-size: 14.5px; color: var(--ink); margin-bottom: 10px; }
.sh .n { width: 22px; height: 22px; border-radius: 50%; flex: none; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); }
.opt { display: inline-flex; align-items: center; gap: 8px; }
.opt :deep(img.tool-icon), .opt :deep(i) { width: 20px; height: 20px; font-size: 18px; }

.inst-row { display: flex; align-items: flex-start; gap: 10px; }
.newnode { margin-top: 12px; padding: 14px; border-radius: 12px; background: var(--hover); border: 1px dashed var(--border-2); }

.seg { display: inline-flex; gap: 2px; padding: 3px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
.seg button { display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; padding: 8px 18px; border-radius: 9px; cursor: pointer; font-family: var(--font); font-weight: 700; font-size: 13px; color: var(--ink-3); transition: background .15s, color .15s; }
.seg button:hover { color: var(--ink); }
.seg button.on { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); }
.modehint { font-size: 12.5px; color: var(--ink-3); margin: 8px 0 0; }
.muted { font-size: 13px; color: var(--ink-3); }
.pfield { margin-bottom: 12px; }

.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 14px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.mbtn.sm { padding: 8px 14px; font-size: 13px; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn.ghost:hover:not(:disabled) { background: var(--hover); border-color: var(--border-2); }
.mbtn:disabled { opacity: .55; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: dspin .7s linear infinite; }
@keyframes dspin { to { transform: rotate(360deg); } }
</style>
