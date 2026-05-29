import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'
import vuetify from './plugins/vuetify.js'
import i18n from './plugins/i18n.js'
import router from './router/index.js'
import { loadAllPlugins } from './plugins/loader.js'
import { registerBuiltinPlugins } from './plugins/index.js'
import { bootCompact } from './plugins/styles.js'
import { bootPreset } from './plugins/presets.js'

// Apply the persisted theme preset (color palette + shape style) and
// the orthogonal compact toggle BEFORE the SPA mounts so the first
// paint already reflects user preferences (no flash of vanilla
// Vuetify between mount and the reactive update Profile would
// otherwise drive). The color side rides on Vuetify's `defaultTheme`
// — set by `plugins/vuetify.js` from the same persisted preset id.
bootPreset()
bootCompact()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
setActivePinia(pinia)
app.use(i18n)

// Built-in plugin stubs (bundled with the host).
registerBuiltinPlugins()

// External plugins whose routes must be registered before the router mounts.
// Kept small on purpose — plugins whose absence is recoverable load lazily.
const REQUIRED_PLUGINS = ['id', 'ui', 'prov']

;(async () => {
  await loadAllPlugins(REQUIRED_PLUGINS)
  app.use(vuetify)
  app.use(router)
  app.mount('#app')
})()
