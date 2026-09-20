import { createApp } from 'vue'
import LoginApp from './LoginApp.vue'
// Self-hosted Bricolage Grotesque via @fontsource (npm; woff2 bundled locally at
// build time, nothing committed). Latin subset only (it covers French and
// English; the per-subset files carry no unicode-range, so several of them would
// overlap and each be downloaded), weights 600/700/800 — matching the main app (see plugins/vuetify.js).
import '@fontsource/bricolage-grotesque/latin-600.css'
import '@fontsource/bricolage-grotesque/latin-700.css'
import '@fontsource/bricolage-grotesque/latin-800.css'

createApp(LoginApp).mount('#app')
