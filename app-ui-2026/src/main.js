import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from '@2026/App.vue'
// Reuse the current app's Vuetify (incl. all theme presets) and i18n setup,
// plus the preset/compact boot — imported read-only from core via `@`.
import vuetify from '@/plugins/vuetify.js'
import i18n from '@/plugins/i18n.js'
import { useI18nStore } from '@/stores/i18n.js'
import { bootCompact } from '@/plugins/styles.js'
import { bootPreset } from '@/plugins/presets.js'
import router from '@2026/router.js'
// Dynamic plugin loader (shared with the live app via @ligoj/host). Loading
// real plugin bundles unlocks their i18n bundles, custom parameter fields and
// subscription-detail renderers in the 2026 app — parity with app-ui.
import { loadAllPlugins } from '@/plugins/loader.js'
import { registerBuiltinPlugins } from '@/plugins/index.js'
// plugin-id contributes a few EXTRA i18n fragments (2026 chrome keys, status
// labels). We still merge them explicitly so they're present before the
// bundle loads and for keys the bundle doesn't carry.
import pluginIdEn from '@2026/i18n/plugin-id-en.js'
import pluginIdFr from '@2026/i18n/plugin-id-fr.js'
// Theme "style" layer: reskins the 2026 components (font + radius + shadow +
// glow) per <html data-style="…">, the dimension Fabrice's presets drive.
import '@2026/styles/v26-styles.css'

// Apply persisted preset + compact before mount (same as app-ui) so the
// first paint already reflects the user's theme.
bootPreset()
bootCompact()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
setActivePinia(pinia)
const i18nStore = useI18nStore()
app.use(i18n)
app.use(vuetify)
app.use(router)

// Register built-in plugin stubs, then eagerly load the core service plugins
// (their routes/i18n/features must exist before navigation). Mirrors app-ui's
// main.js. allSettled inside loadAllPlugins means a plugin that isn't
// installed on this backend is skipped quietly. App.vue lazily loads the
// remaining installed plugins from the session's appSettings.
registerBuiltinPlugins()

;(async () => {
  try { await loadAllPlugins(['id', 'ui', 'prov']) } catch { /* keep booting */ }
  // Merge the 2026 fragments AFTER plugin bundles so our clean 2026 chrome
  // keys win over the plugin's own copies (e.g. the wizard step labels: the
  // plugin-ui bundle ships "1. Service" while the 2026 dialog renders its
  // own numbered badges and wants the bare "Service").
  i18nStore.merge(pluginIdEn, 'en')
  i18nStore.merge(pluginIdFr, 'fr')
  app.mount('#app')
})()
