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

.swagger-host { border: 1px solid var(--border); border-radius: 18px; background: #fff; overflow: hidden; box-shadow: 0 18px 40px -30px rgba(0, 0, 0, .45); min-height: 60vh; }
.swagger-host #swagger-ui { min-height: 60vh; }
/* Trim Swagger UI's own top bar (we provide the page header). */
.swagger-host :deep(.swagger-ui .topbar) { display: none; }
.swagger-host :deep(.swagger-ui .info) { margin: 20px 0; }
</style>
