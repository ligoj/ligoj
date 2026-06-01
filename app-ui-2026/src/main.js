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
// plugin-id contributes a few i18n fragments (confirm sentences, status
// labels) on top of the host's base user.* keys. The standalone app does
// NOT run the dynamic plugin-loader, so we merge them explicitly here —
// mirror of plugin-id/ui/src/index.js (i18n.merge at install time).
import pluginIdEn from '@2026/i18n/plugin-id-en.js'
import pluginIdFr from '@2026/i18n/plugin-id-fr.js'

// Apply persisted preset + compact before mount (same as app-ui) so the
// first paint already reflects the user's theme.
bootPreset()
bootCompact()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
setActivePinia(pinia)
// Merge plugin-id translations once pinia is active (the i18n store needs it).
const i18nStore = useI18nStore()
i18nStore.merge(pluginIdEn, 'en')
i18nStore.merge(pluginIdFr, 'fr')
app.use(i18n)
app.use(vuetify)
app.use(router)
app.mount('#app')
