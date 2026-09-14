import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'
import vuetify from './plugins/vuetify.js'
import i18n from './plugins/i18n.js'
import router from './router/index.js'
import { loadAllPlugins } from './plugins/loader.js'
import { eagerPlugins } from './plugins/eager-plugins.js'
import { useAuthStore } from './stores/auth.js'
import { bootCompact, bootReduceMotion } from './plugins/styles.js'
import { bootPreset } from './plugins/presets.js'
import { installErrorReporter } from './plugins/errorReporter.js'

// Apply the persisted theme preset (color palette + shape style) and
// the orthogonal compact toggle BEFORE the SPA mounts so the first
// paint already reflects user preferences (no flash of vanilla
// Vuetify between mount and the reactive update Profile would
// otherwise drive). The color side rides on Vuetify's `defaultTheme`
// — set by `plugins/vuetify.js` from the same persisted preset id.
bootPreset()
bootCompact()
bootReduceMotion()

const app = createApp(App)
const pinia = createPinia()

// Capture browser JS errors and forward them to the backend as early as
// possible, so failures during boot are reported too.
installErrorReporter(app)

app.use(pinia)
setActivePinia(pinia)
app.use(i18n)

// Domain i18n now ships WITH each plugin: plugin-id / plugin-ui (and the
// other plugins) merge their own en/fr bundles in `install()`. The host
// keeps only the generic keys in `i18n/{en,fr}.js`. The old
// `i18n/plugin-id-*.js` monolith merged here is gone.

// External plugins whose routes must be registered before the router mounts
// (`REQUIRED_PLUGINS`: id / ui / prov). Only the ones the backend reports as
// installed are requested: the session lists the bundle-shipping plugins, so
// a deployment without plugin-prov never fetches `/main/prov/vue/index.js`.
// Without a session (expired, redirect to the login page) nothing is loaded:
// App.vue redirects as soon as it mounts.
  ; (async () => {
    const auth = useAuthStore()
    const ok = await auth.fetchSession()
    if (ok) {
      await loadAllPlugins(eagerPlugins(auth.appSettings?.data?.['ui-plugins']))
    }
    app.use(vuetify)
    app.use(router)
    app.mount('#app')
  })()
