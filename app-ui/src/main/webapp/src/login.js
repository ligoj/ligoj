import { createApp } from 'vue'
import LoginApp from './LoginApp.vue'
// Self-hosted Bricolage Grotesque via @fontsource (npm; woff2 bundled locally at
// build time, nothing committed). Subsets latin/latin-ext/vietnamese, weights
// 600/700/800 — matching the main app (see plugins/vuetify.js).
import '@fontsource/bricolage-grotesque/latin-600.css'
import '@fontsource/bricolage-grotesque/latin-700.css'
import '@fontsource/bricolage-grotesque/latin-800.css'
import '@fontsource/bricolage-grotesque/latin-ext-600.css'
import '@fontsource/bricolage-grotesque/latin-ext-700.css'
import '@fontsource/bricolage-grotesque/latin-ext-800.css'
import '@fontsource/bricolage-grotesque/vietnamese-600.css'
import '@fontsource/bricolage-grotesque/vietnamese-700.css'
import '@fontsource/bricolage-grotesque/vietnamese-800.css'

createApp(LoginApp).mount('#app')
