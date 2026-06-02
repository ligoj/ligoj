<!--
  ApiHomeView — 2026 "Vibrant" API explorer (API). Instead of embedding the
  backend's heavy, dark-themed Swagger UI (which clashes with the 2026 shell),
  this renders the OpenAPI document (rest/openapi.json) natively in the Vibrant
  style: breadcrumb-chip header, KPI stats, a search box + method filter chips,
  and endpoints grouped by tag into collapsible sections of expandable cards
  (method pill + mono path + summary → parameters / request body / responses).
  Read-only browsing; the raw spec stays one click away via "Download OpenAPI".
-->
<template>
  <div class="apihome">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb cur"><v-icon size="13">mdi-api</v-icon>{{ t('api.title') }}</span></nav>
        <h1>{{ spec?.info?.title || t('api.title') }}<span v-if="spec?.info?.version" class="ver">{{ spec.info.version }}</span></h1>
        <p class="sub">{{ spec?.info?.description || t('api.subtitle') }}</p>
      </div>
      <a class="btn-ghost" :href="OPENAPI_URL" target="_blank" rel="noopener"><v-icon size="18">mdi-code-json</v-icon>{{ t('api.downloadOpenapi') }}</a>
    </header>

    <div v-if="!error" class="stats">
      <div v-for="(s, i) in stats" :key="s.key" class="stat" :style="{ '--c': s.color, 'animation-delay': (i * 50) + 'ms' }">
        <span class="sicon"><v-icon size="22">{{ s.icon }}</v-icon></span>
        <div><div class="snum">{{ s.value }}</div><div class="slabel">{{ s.label }}</div></div>
      </div>
    </div>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>
    <div v-if="loading" class="loadbar"><i /></div>

    <template v-if="!loading && !error">
      <div class="toolbar">
        <div class="search">
          <v-icon size="17" class="search-ic">mdi-magnify</v-icon>
          <input v-model="query" type="text" :placeholder="t('api.searchPlaceholder')" />
          <button v-if="query" class="search-x" @click="query = ''"><v-icon size="15">mdi-close</v-icon></button>
        </div>
        <div class="methods">
          <button v-for="m in methodsPresent" :key="m" class="mchip" :class="[m, { on: activeMethods.has(m) }]" @click="toggleMethod(m)">{{ m }}</button>
        </div>
        <span class="tb-sp" />
        <button class="link-btn" @click="toggleAll">{{ allOpen ? t('api.collapseAll') : t('api.expandAll') }}</button>
      </div>

      <div v-if="!groups.length" class="empty">
        <span class="empty-ic"><v-icon size="30">mdi-magnify-close</v-icon></span>
        <p>{{ t('api.noResults') }}</p>
      </div>

      <section v-for="g in groups" :key="g.tag" class="group">
        <button class="group-head" @click="toggleTag(g.tag)">
          <v-icon size="18" class="g-caret" :class="{ open: isTagOpen(g.tag) }">mdi-chevron-right</v-icon>
          <span class="g-name">{{ g.tag }}</span>
          <span class="g-count">{{ g.items.length }}</span>
          <span v-if="g.desc" class="g-desc">{{ g.desc }}</span>
        </button>
        <div v-if="isTagOpen(g.tag)" class="ops">
          <div v-for="o in g.items" :key="o.key" class="op" :class="o.method">
            <button class="op-head" @click="toggleOp(o.key)">
              <span class="op-method" :class="o.method">{{ o.method }}</span>
              <code class="op-path" :class="{ dep: o.op.deprecated }">{{ o.path }}</code>
              <span class="op-sum">{{ o.op.summary || o.op.operationId || '' }}</span>
              <span v-if="o.op.deprecated" class="op-dep">{{ t('api.deprecated') }}</span>
              <v-icon size="18" class="op-caret" :class="{ open: isOpOpen(o.key) }">mdi-chevron-down</v-icon>
            </button>
            <div v-if="isOpOpen(o.key)" class="op-body">
              <p v-if="o.op.description" class="op-desc">{{ o.op.description }}</p>

              <div class="sec">
                <h4>{{ t('api.params') }}</h4>
                <div v-if="(o.op.parameters || []).length" class="params">
                  <div v-for="p in o.op.parameters" :key="(p.in || '') + p.name" class="param">
                    <span class="p-in" :class="p.in">{{ p.in }}</span>
                    <code class="p-name">{{ p.name }}</code>
                    <span v-if="p.required" class="p-req">{{ t('api.required') }}</span>
                    <span class="p-type">{{ typeLabel(p.schema) }}</span>
                    <span v-if="p.description" class="p-desc">{{ p.description }}</span>
                  </div>
                </div>
                <p v-else class="muted">{{ t('api.noParams') }}</p>
              </div>

              <div v-if="o.op.requestBody" class="sec">
                <h4>{{ t('api.requestBody') }}</h4>
                <div class="params">
                  <div v-for="ct in bodyTypes(o.op.requestBody)" :key="ct.type" class="param">
                    <span class="p-in body">{{ ct.type }}</span>
                    <span class="p-type">{{ ct.schema }}</span>
                    <span v-if="o.op.requestBody.required" class="p-req">{{ t('api.required') }}</span>
                  </div>
                </div>
              </div>

              <div class="sec">
                <h4>{{ t('api.responses') }}</h4>
                <div class="params">
                  <div v-for="r in responses(o.op)" :key="r.code" class="param">
                    <span class="code-badge" :class="codeClass(r.code)">{{ r.code }}</span>
                    <span class="p-desc">{{ r.description }}</span>
                    <span v-if="r.type" class="p-type">{{ r.type }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useApi, useAppStore, useI18nStore, APP_BASE } from '@ligoj/host'

const api = useApi()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const base = APP_BASE
const OPENAPI_URL = `${base}rest/openapi.json`

const spec = ref(null)
const loading = ref(true)
const error = ref(null)

const query = ref('')
const activeMethods = reactive(new Set())
const openTags = reactive(new Set())
const openOps = reactive(new Set())

const METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
const METHOD_COLOR = { get: '#2f6df6', post: '#1d9d63', put: '#d9701a', patch: '#d9701a', delete: '#df4d42', head: '#8b5cf6', options: '#8b5cf6' }

// Flatten the spec's paths into operations, tagged for grouping.
const operations = computed(() => {
  const out = []
  const paths = spec.value?.paths || {}
  for (const path of Object.keys(paths)) {
    for (const method of Object.keys(paths[path])) {
      if (!METHOD_ORDER.includes(method)) continue
      const op = paths[path][method]
      out.push({ key: `${method}|${path}`, method, path, op, tag: (op.tags && op.tags[0]) || 'default' })
    }
  }
  return out
})

const methodsPresent = computed(() => METHOD_ORDER.filter((m) => operations.value.some((o) => o.method === m)))

function toggleMethod(m) { activeMethods.has(m) ? activeMethods.delete(m) : activeMethods.add(m) }

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return operations.value.filter((o) => {
    if (activeMethods.size && !activeMethods.has(o.method)) return false
    if (!q) return true
    return o.path.toLowerCase().includes(q)
      || (o.op.summary || '').toLowerCase().includes(q)
      || o.tag.toLowerCase().includes(q)
      || (o.op.operationId || '').toLowerCase().includes(q)
  })
})

// Group filtered ops by tag, ordering tags as declared in the spec then alpha.
const groups = computed(() => {
  const declared = (spec.value?.tags || []).map((t2) => t2.name)
  const descByTag = Object.fromEntries((spec.value?.tags || []).map((t2) => [t2.name, t2.description]))
  const byTag = {}
  for (const o of filtered.value) (byTag[o.tag] ||= []).push(o)
  const tags = Object.keys(byTag).sort((a, b) => {
    const ia = declared.indexOf(a); const ib = declared.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
  return tags.map((tag) => ({
    tag,
    desc: descByTag[tag] || '',
    items: byTag[tag].sort((a, b) => a.path.localeCompare(b.path) || METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method)),
  }))
})

// When searching, force every matching group open; otherwise honour the manual
// open set (default: collapsed, since the API is large).
function isTagOpen(tag) { return query.value.trim() ? true : openTags.has(tag) }
function toggleTag(tag) { if (query.value.trim()) return; openTags.has(tag) ? openTags.delete(tag) : openTags.add(tag) }
const allOpen = computed(() => groups.value.length > 0 && groups.value.every((g) => isTagOpen(g.tag)))
function toggleAll() {
  if (allOpen.value) { openTags.clear() }
  else { groups.value.forEach((g) => openTags.add(g.tag)) }
}
function isOpOpen(k) { return openOps.has(k) }
function toggleOp(k) { openOps.has(k) ? openOps.delete(k) : openOps.add(k) }

const stats = computed(() => [
  { key: 'ops', label: t('api.endpoints'), icon: 'mdi-transit-connection-variant', color: 'rgb(var(--v-theme-secondary))', value: operations.value.length },
  { key: 'tags', label: t('api.groups'), icon: 'mdi-tag-multiple-outline', color: '#2f6df6', value: new Set(operations.value.map((o) => o.tag)).size },
  { key: 'ver', label: 'OpenAPI', icon: 'mdi-code-json', color: '#1d9d63', value: spec.value?.openapi || '3.0' },
])

/* --- schema helpers (defensive against the OpenAPI 3.0 shape) --- */
function refName(ref) { return ref ? ref.split('/').pop() : '' }
function typeLabel(schema) {
  if (!schema) return ''
  if (schema.$ref) return refName(schema.$ref)
  if (schema.type === 'array') return (typeLabel(schema.items) || 'object') + '[]'
  if (Array.isArray(schema.enum)) return schema.enum.slice(0, 4).join(' | ') + (schema.enum.length > 4 ? ' …' : '')
  if (schema.format) return `${schema.type} (${schema.format})`
  return schema.type || 'object'
}
function bodyTypes(rb) {
  const content = rb?.content || {}
  return Object.keys(content).map((type) => ({ type, schema: typeLabel(content[type]?.schema) }))
}
function responses(op) {
  const r = op.responses || {}
  return Object.keys(r).map((code) => {
    const content = r[code]?.content || {}
    const firstCt = Object.keys(content)[0]
    return { code, description: r[code]?.description || '', type: firstCt ? typeLabel(content[firstCt]?.schema) : '' }
  })
}
function codeClass(code) {
  const n = parseInt(code, 10)
  if (n >= 200 && n < 300) return 'ok'
  if (n >= 300 && n < 400) return 'info'
  if (n >= 400 && n < 500) return 'warn'
  if (n >= 500) return 'err'
  return 'def'
}

async function load() {
  loading.value = true; error.value = null
  try {
    const data = await api.get('rest/openapi.json')
    spec.value = data
    // Open the first few tag groups by default so the page isn't a wall of
    // collapsed headers, but keep the rest collapsed (the API is large).
    groups.value.slice(0, 1).forEach((g) => openTags.add(g.tag))
  } catch { error.value = t('common.loadError') || 'Unable to load the API description.' }
  loading.value = false
}

onMounted(() => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('api.title') }], { refresh: load })
  load()
})
</script>

<style scoped>
.apihome {
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
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; display: inline-flex; align-items: baseline; gap: 12px; }
.ver { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--accent); background: rgba(var(--v-theme-secondary), .12); padding: 3px 9px; border-radius: 8px; letter-spacing: 0; }
.ph-txt .sub { margin: 6px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; max-width: 70ch; }
.btn-ghost { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 16px; border-radius: 12px; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--ink-2); text-decoration: none; transition: border-color .15s, background .15s; }
.btn-ghost:hover { border-color: var(--border-2); background: var(--hover); }

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 18px; }
.stat { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--border); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 9%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); opacity: 0; transform: translateY(10px); animation: rise .5s cubic-bezier(.2, .7, .3, 1) forwards; }
@keyframes rise { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .stat { animation: none; opacity: 1; transform: none; } }
.sicon { width: 46px; height: 46px; border-radius: 13px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.snum { font-family: var(--mono); font-weight: 700; font-size: 24px; line-height: 1; color: var(--ink); }
.slabel { font-size: 12.5px; font-weight: 600; color: var(--ink-3); margin-top: 4px; }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }
.loadbar { height: 4px; border-radius: 3px; background: var(--pill); overflow: hidden; margin-bottom: 16px; }
.loadbar i { display: block; height: 100%; width: 40%; border-radius: 3px; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, white)); animation: slide 1.1s ease-in-out infinite; }
@keyframes slide { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }

.toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.search { display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; height: 42px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); min-width: 280px; flex: 1; max-width: 420px; transition: border-color .15s; }
.search:focus-within { border-color: var(--border-2); }
.search-ic { color: var(--ink-3); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-family: var(--font); font-size: 13.5px; font-weight: 500; min-width: 0; }
.search input::placeholder { color: var(--ink-3); }
.search-x { border: 0; background: transparent; cursor: pointer; color: var(--ink-3); display: grid; place-items: center; padding: 2px; border-radius: 6px; }
.search-x:hover { color: var(--ink); background: var(--hover); }
.methods { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.mchip { font-family: var(--font); font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; padding: 7px 11px; border-radius: 9px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-3); cursor: pointer; transition: all .14s; }
.mchip:hover { border-color: var(--border-2); }
.mchip.on { color: #fff; border-color: transparent; }
.mchip.on.get { background: #2f6df6; } .mchip.on.post { background: #1d9d63; }
.mchip.on.put, .mchip.on.patch { background: #d9701a; } .mchip.on.delete { background: #df4d42; }
.mchip.on.head, .mchip.on.options { background: #8b5cf6; }
.tb-sp { flex: 1; }
.link-btn { border: 0; background: transparent; cursor: pointer; font-family: var(--font); font-weight: 700; font-size: 13px; color: var(--accent); padding: 6px 8px; border-radius: 8px; }
.link-btn:hover { background: var(--hover); }

.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--ink-3); }
.empty-ic { width: 60px; height: 60px; border-radius: 18px; display: grid; place-items: center; color: var(--ink-3); background: var(--pill); }
.empty p { margin: 0; font-weight: 600; font-size: 14px; }

.group { margin-bottom: 10px; }
.group-head { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 6px; border: 0; background: transparent; cursor: pointer; text-align: left; border-bottom: 1px solid var(--border); }
.g-caret { color: var(--ink-3); transition: transform .2s; }
.g-caret.open { transform: rotate(90deg); }
.g-name { font-family: var(--font); font-weight: 800; font-size: 17px; color: var(--ink); letter-spacing: -.02em; }
.g-count { font-family: var(--mono); font-size: 11.5px; font-weight: 700; color: var(--ink-3); background: var(--pill); padding: 2px 9px; border-radius: 999px; }
.g-desc { font-size: 12.5px; color: var(--ink-3); font-weight: 500; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ops { display: flex; flex-direction: column; gap: 8px; padding: 10px 0 4px; }
.op { border: 1px solid var(--border); border-radius: 13px; overflow: hidden; background: var(--card); transition: border-color .15s, box-shadow .15s; }
.op:hover { box-shadow: 0 6px 18px -12px rgba(0, 0, 0, .4); }
.op.get { background: color-mix(in srgb, #2f6df6 5%, var(--card)); }
.op.post { background: color-mix(in srgb, #1d9d63 6%, var(--card)); }
.op.put, .op.patch { background: color-mix(in srgb, #d9701a 6%, var(--card)); }
.op.delete { background: color-mix(in srgb, #df4d42 6%, var(--card)); }
.op-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 0; background: transparent; cursor: pointer; text-align: left; }
.op-method { flex: none; min-width: 64px; text-align: center; font-family: var(--font); font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #fff; padding: 5px 8px; border-radius: 8px; }
.op-method.get { background: #2f6df6; } .op-method.post { background: #1d9d63; }
.op-method.put, .op-method.patch { background: #d9701a; } .op-method.delete { background: #df4d42; }
.op-method.head, .op-method.options { background: #8b5cf6; }
.op-path { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--ink); }
.op-path.dep { text-decoration: line-through; opacity: .6; }
.op-sum { font-size: 13px; color: var(--ink-3); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.op-dep { font-family: var(--font); font-weight: 700; font-size: 10px; text-transform: uppercase; color: #d9701a; background: rgba(217, 112, 26, .14); padding: 2px 7px; border-radius: 999px; flex: none; }
.op-caret { margin-left: auto; flex: none; color: var(--ink-3); transition: transform .2s; }
.op-caret.open { transform: rotate(180deg); }

.op-body { padding: 4px 16px 16px; border-top: 1px solid var(--border); animation: reveal .22s ease; }
@keyframes reveal { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.op-desc { margin: 12px 0; font-size: 13px; color: var(--ink-2); line-height: 1.55; }
.sec { margin-top: 14px; }
.sec h4 { font-family: var(--font); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-3); margin: 0 0 8px; }
.params { display: flex; flex-direction: column; gap: 6px; }
.param { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 8px 10px; border-radius: 10px; background: var(--pill); }
.p-in { font-family: var(--font); font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; padding: 2px 8px; border-radius: 999px; color: var(--ink-2); background: rgba(var(--v-theme-on-surface), .1); flex: none; }
.p-in.path { color: #d9701a; background: rgba(217, 112, 26, .14); }
.p-in.query { color: #2f6df6; background: rgba(47, 109, 246, .13); }
.p-in.header { color: #8b5cf6; background: rgba(139, 92, 246, .14); }
.p-in.body { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.p-name { font-family: var(--mono); font-size: 12.5px; font-weight: 600; color: var(--ink); }
.p-req { font-family: var(--font); font-weight: 700; font-size: 10px; text-transform: uppercase; color: #df4d42; background: rgba(223, 77, 66, .12); padding: 2px 7px; border-radius: 999px; }
.p-type { font-family: var(--mono); font-size: 11.5px; color: var(--ink-3); background: rgba(var(--v-theme-on-surface), .06); padding: 2px 7px; border-radius: 6px; }
.p-desc { font-size: 12.5px; color: var(--ink-3); flex: 1; min-width: 120px; }
.muted { font-size: 12.5px; color: var(--ink-3); margin: 0; }
.code-badge { font-family: var(--mono); font-weight: 700; font-size: 12px; padding: 3px 9px; border-radius: 8px; flex: none; }
.code-badge.ok { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.code-badge.info { color: #2f6df6; background: rgba(47, 109, 246, .13); }
.code-badge.warn { color: #d9701a; background: rgba(217, 112, 26, .14); }
.code-badge.err { color: #df4d42; background: rgba(223, 77, 66, .14); }
.code-badge.def { color: var(--ink-2); background: var(--pill); }
</style>
