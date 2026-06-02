<!--
  ApiHomeView — 2026 "Vibrant" API explorer (API). Ports plugin-ui's
  ApiHomeView logic (loads the backend-served Swagger UI bundle + CSS and mounts
  the interactive OpenAPI explorer, with the legacy advanced filter plug-in)
  under the Vibrant chrome: breadcrumb-chip header + a "Download OpenAPI" ghost
  button. Swagger UI ships its own typography, so the explorer sits in a plain
  rounded host; the injected stylesheets are removed on unmount so their heavy
  resets don't leak into the rest of the 2026 shell.
-->
<template>
  <div class="apihome">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb cur"><v-icon size="13">mdi-api</v-icon>{{ t('api.title') }}</span></nav>
        <h1>{{ t('api.title') }}</h1>
        <p class="sub">{{ t('api.subtitle') }}</p>
      </div>
      <a class="btn-ghost" :href="OPENAPI_URL" target="_blank" rel="noopener"><v-icon size="18">mdi-code-json</v-icon>{{ t('api.downloadOpenapi') }}</a>
    </header>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>
    <div v-if="loading" class="loadbar"><i /></div>

    <!-- Swagger-UI mounts itself here once its bundle loads. -->
    <div class="swagger-host"><div id="swagger-ui" /></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useAppStore, useI18nStore, APP_BASE } from '@ligoj/host'

const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const loading = ref(true)
const error = ref(null)

const base = APP_BASE
const SWAGGER_BUNDLE_URL = `${base}rest/swagger-ui-bundle.js`
const SWAGGER_PRESET_URL = `${base}rest/swagger-ui-standalone-preset.js`
const SWAGGER_CSS_URL = `${base}rest/swagger-ui.css`
const SWAGGER_EXTRA_CSS = `${base}rest/index.css`
const OPENAPI_URL = `${base}rest/openapi.json`

/** Advanced filter plug-in ported from the legacy home.js — matches operation
 *  summary / description / path against the filter phrase and hides whole tag
 *  groups that end up empty. */
function buildAdvancedFilterPlugin() {
  return () => ({
    fn: {
      opsFilter(taggedOps, phrase) {
        const needle = phrase.toLowerCase()
        const filtered = taggedOps.map((tag) => {
          tag._root.entries[1][1] = tag._root.entries[1][1].filter((op) => {
            const json = JSON.parse(JSON.stringify(op))
            const summary = (json.operation.summary || '').toString().toLowerCase()
            const description = (json.operation.description || '').toString().toLowerCase()
            return json.path.toLowerCase().includes(needle) || summary.includes(needle) || description.includes(needle)
          })
          return tag
        })
        return filtered.filter((tag) => tag._root.entries[1][1].size > 0)
      },
    },
  })
}

function injectStylesheet(href, id) {
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = href
  document.head.appendChild(link)
}
function removeElement(id) { document.getElementById(id)?.remove() }
function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return }
    const s = document.createElement('script')
    s.id = id; s.src = src; s.async = true
    s.onload = resolve
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

function mount() {
  const { SwaggerUIBundle, SwaggerUIStandalonePreset } = window
  if (!SwaggerUIBundle) { error.value = 'Swagger UI bundle is unavailable.'; return }
  window.ui = SwaggerUIBundle({
    url: OPENAPI_URL,
    dom_id: '#swagger-ui',
    displayRequestDuration: true,
    deepLinking: false,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.FiltrePreset, buildAdvancedFilterPlugin()].filter(Boolean),
    filter: true,
    layout: 'StandaloneLayout',
    validatorUrl: 'https://validator.swagger.io/validator',
  })
}

onMounted(async () => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('api.title') }])
  injectStylesheet(SWAGGER_CSS_URL, 'swagger-ui-css')
  injectStylesheet(SWAGGER_EXTRA_CSS, 'swagger-ui-extra-css')
  try {
    await Promise.all([
      loadScript(SWAGGER_BUNDLE_URL, 'swagger-ui-bundle'),
      loadScript(SWAGGER_PRESET_URL, 'swagger-ui-preset'),
    ])
    mount()
  } catch (e) {
    error.value = e.message || 'Unable to load Swagger UI.'
  } finally { loading.value = false }
})

onBeforeUnmount(() => {
  removeElement('swagger-ui-css')
  removeElement('swagger-ui-extra-css')
  delete window.ui
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
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
.crumbs { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.crumb { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font); font-size: 11.5px; font-weight: 700; color: var(--ink-3); background: var(--pill); border-radius: 999px; padding: 3px 10px; }
.crumb.cur { color: var(--accent); background: rgba(var(--v-theme-secondary), .12); }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.btn-ghost { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 16px; border-radius: 12px; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--ink-2); text-decoration: none; transition: border-color .15s, background .15s; }
.btn-ghost:hover { border-color: var(--border-2); background: var(--hover); }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }
.loadbar { height: 4px; border-radius: 3px; background: var(--pill); overflow: hidden; margin-bottom: 16px; }
.loadbar i { display: block; height: 100%; width: 40%; border-radius: 3px; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, white)); animation: slide 1.1s ease-in-out infinite; }
@keyframes slide { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }

.swagger-host { border: 1px solid var(--border); border-radius: 18px; background: var(--surface); overflow: hidden; box-shadow: 0 18px 40px -30px rgba(0, 0, 0, .45); min-height: 60vh; padding: 4px 20px 18px; }
.swagger-host #swagger-ui { min-height: 60vh; }
</style>

<!--
  Unscoped (but confined under .apihome) re-skin of the backend's Swagger UI:
  it ships a hardcoded DARK theme (root rgb(28,32,34)) that clashes with the
  2026 shell. We re-theme it onto the Vibrant tokens so it follows light/dark.
  The .apihome custom props cascade into the runtime-built Swagger DOM (it's a
  descendant), and the extra `.apihome` selector segment lifts specificity above
  Swagger's own `.swagger-ui …` rules regardless of stylesheet injection order.
-->
<style>
.apihome .swagger-ui { background: transparent !important; color: var(--ink) !important; font-family: var(--font) !important; }
.apihome .swagger-ui .topbar { display: none !important; }
.apihome .swagger-ui .wrapper { padding: 0 !important; max-width: none !important; }

/* Generic text + links */
.apihome .swagger-ui,
.apihome .swagger-ui .info .title,
.apihome .swagger-ui .info p,
.apihome .swagger-ui .info li,
.apihome .swagger-ui .opblock-tag,
.apihome .swagger-ui label,
.apihome .swagger-ui table thead tr th,
.apihome .swagger-ui .parameter__name,
.apihome .swagger-ui .parameter__type,
.apihome .swagger-ui .response-col_status,
.apihome .swagger-ui .response-col_description,
.apihome .swagger-ui .opblock-title_normal,
.apihome .swagger-ui .tab li { color: var(--ink) !important; }
.apihome .swagger-ui .info p,
.apihome .swagger-ui .parameter__type,
.apihome .swagger-ui .opblock-summary-description { color: var(--ink-3) !important; }
.apihome .swagger-ui a, .apihome .swagger-ui .info a { color: var(--accent) !important; }

/* Info block + version/OAS pills */
.apihome .swagger-ui .info { margin: 18px 0 22px !important; }
.apihome .swagger-ui .info .title small { background: var(--pill) !important; border-radius: 999px; }
.apihome .swagger-ui .info .title small pre { color: var(--ink-2) !important; }

/* Servers / Authorize bar → Vibrant card */
.apihome .swagger-ui .scheme-container { background: var(--card) !important; box-shadow: none !important; border: 1px solid var(--border); border-radius: 16px; padding: 16px 18px; margin: 0 0 18px; }
.apihome .swagger-ui .scheme-container .schemes-title { color: var(--ink-2) !important; }

/* Inputs / selects / textareas → Vibrant fields */
.apihome .swagger-ui .filter .operation-filter-input,
.apihome .swagger-ui input[type=text],
.apihome .swagger-ui input[type=password],
.apihome .swagger-ui input[type=email],
.apihome .swagger-ui input[type=search],
.apihome .swagger-ui textarea,
.apihome .swagger-ui select { background: var(--surface) !important; color: var(--ink) !important; border: 1px solid var(--border) !important; border-radius: 11px !important; font-family: var(--font) !important; box-shadow: none !important; }
.apihome .swagger-ui textarea { font-family: var(--mono) !important; }
.apihome .swagger-ui .filter .operation-filter-input { padding: 11px 14px !important; }

/* Tag section header */
.apihome .swagger-ui .opblock-tag { border-bottom: 1px solid var(--border) !important; font-family: var(--font) !important; font-weight: 800 !important; font-size: 18px !important; letter-spacing: -.02em; padding: 20px 4px 12px !important; }
.apihome .swagger-ui .opblock-tag:hover { background: transparent !important; }
.apihome .swagger-ui .opblock-tag small { color: var(--ink-3) !important; font-weight: 500; }

/* Operation blocks → rounded Vibrant cards */
.apihome .swagger-ui .opblock { border-radius: 14px !important; border: 1px solid var(--border) !important; background: var(--card) !important; box-shadow: 0 2px 10px rgba(0,0,0,.04) !important; margin: 0 0 10px !important; }
.apihome .swagger-ui .opblock .opblock-summary { border: 0 !important; padding: 7px 10px !important; }
.apihome .swagger-ui .opblock-summary-path,
.apihome .swagger-ui .opblock-summary-path__deprecated { font-family: var(--mono) !important; color: var(--ink) !important; }
.apihome .swagger-ui .opblock .opblock-summary-method { border-radius: 9px !important; font-family: var(--font) !important; font-weight: 800 !important; min-width: 82px; text-shadow: none !important; box-shadow: none !important; }

/* Method tints + badge colours */
.apihome .swagger-ui .opblock.opblock-get { background: color-mix(in srgb, #2f6df6 7%, var(--card)) !important; border-color: rgba(47,109,246,.32) !important; }
.apihome .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #2f6df6 !important; }
.apihome .swagger-ui .opblock.opblock-post { background: color-mix(in srgb, #1d9d63 8%, var(--card)) !important; border-color: rgba(29,157,99,.32) !important; }
.apihome .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #1d9d63 !important; }
.apihome .swagger-ui .opblock.opblock-put { background: color-mix(in srgb, #d9701a 8%, var(--card)) !important; border-color: rgba(217,112,26,.32) !important; }
.apihome .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #d9701a !important; }
.apihome .swagger-ui .opblock.opblock-delete { background: color-mix(in srgb, #df4d42 8%, var(--card)) !important; border-color: rgba(223,77,66,.32) !important; }
.apihome .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #df4d42 !important; }

/* Expanded sections / tables */
.apihome .swagger-ui .opblock .opblock-section-header { background: var(--pill) !important; box-shadow: none !important; border-radius: 10px; }
.apihome .swagger-ui .opblock .opblock-section-header h4,
.apihome .swagger-ui .opblock .opblock-section-header label { color: var(--ink) !important; }
.apihome .swagger-ui table.parameters td, .apihome .swagger-ui table.responses-table td,
.apihome .swagger-ui table thead tr th { border-color: var(--border) !important; }
.apihome .swagger-ui .response-col_links { color: var(--ink-3) !important; }
.apihome .swagger-ui .parameter__name.required span { color: #df4d42 !important; }

/* Buttons */
.apihome .swagger-ui .btn { border-radius: 11px !important; font-family: var(--font) !important; font-weight: 700 !important; box-shadow: none !important; }
.apihome .swagger-ui .btn.authorize { color: #1d9d63 !important; border-color: #1d9d63 !important; background: color-mix(in srgb, #1d9d63 8%, transparent) !important; }
.apihome .swagger-ui .btn.authorize svg { fill: #1d9d63 !important; }
.apihome .swagger-ui .btn.execute { background: linear-gradient(135deg,#ff9436,#ff5a52) !important; border-color: transparent !important; color: #fff !important; }
.apihome .swagger-ui .btn.try-out__btn { color: var(--ink-2) !important; border: 1px solid var(--border-2) !important; background: var(--surface) !important; }
.apihome .swagger-ui .btn.cancel { color: #df4d42 !important; border-color: #df4d42 !important; background: transparent !important; }

/* Models + code + arrows */
.apihome .swagger-ui .model, .apihome .swagger-ui .model-title, .apihome .swagger-ui section.models h4 { color: var(--ink-2) !important; }
.apihome .swagger-ui section.models { border-color: var(--border) !important; background: var(--card) !important; border-radius: 14px !important; }
.apihome .swagger-ui .highlight-code, .apihome .swagger-ui .microlight, .apihome .swagger-ui code { font-family: var(--mono) !important; }
.apihome .swagger-ui .opblock-summary svg, .apihome .swagger-ui .expand-operation svg, .apihome .swagger-ui .model-toggle:after { fill: var(--ink-3) !important; }
</style>
