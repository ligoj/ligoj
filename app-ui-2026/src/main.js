import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from '@2026/App.vue'
// Reuse the current app's Vuetify (incl. all theme presets) and i18n setup,
// plus the preset/compact boot — imported read-only from core via `@`.
import vuetify from '@/plugins/vuetify.js'
import i18n from '@/plugins/i18n.js'
import { bootCompact } from '@/plugins/styles.js'
import { bootPreset } from '@/plugins/presets.js'
import router from '@2026/router.js'

// Apply persisted preset + compact before mount (same as app-ui) so the
// first paint already reflects the user's theme.
bootPreset()
bootCompact()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
setActivePinia(pinia)
app.use(i18n)
app.use(vuetify)
app.use(router)
app.mount('#app')
