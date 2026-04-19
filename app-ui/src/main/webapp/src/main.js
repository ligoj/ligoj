import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'
import vuetify from './plugins/vuetify.js'
import i18n from './plugins/i18n.js'
import router from './router/index.js'
import { loadAllPlugins } from './plugins/loader.js'
import { registerBuiltinPlugins } from './plugins/index.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
setActivePinia(pinia)
app.use(i18n)

// Built-in plugin stubs (bundled with the host).
registerBuiltinPlugins()

// External plugins whose routes must be registered before the router mounts.
// Kept small on purpose — plugins whose absence is recoverable load lazily.
const REQUIRED_PLUGINS = ['id']

/**
 * In dev (`npm run dev`), vite's module graph serves the app locally — the
 * import map in v-index.html points at build artefacts (/ligoj/assets/*)
 * that don't exist, so loading plugins via the webjars URL would break once
 * they start importing shared deps. Pull monorepo-local plugin sources
 * directly instead; vite resolves vue/@ligoj/host/etc through its own graph
 * and reactivity stays intact. In prod, the dynamic webjars import is used.
 */
async function loadRequiredPlugins() {
  if (import.meta.env.DEV) {
    const { default: registry } = await import('./plugins/registry.js')
    const devSources = {
      id: () => import('../../../../../ligoj-plugins/plugin-id/ui/src/index.js'),
    }
    for (const id of REQUIRED_PLUGINS) {
      const loader = devSources[id]
      if (!loader) continue
      const mod = await loader()
      const def = mod.default || mod
      if (!def.id) def.id = id
      registry.register(id, def)
      if (def.install) await def.install({ pluginId: id, router })
    }
    return
  }
  await loadAllPlugins(REQUIRED_PLUGINS)
}

;(async () => {
  await loadRequiredPlugins()
  app.use(vuetify)
  app.use(router)
  app.mount('#app')
})()
