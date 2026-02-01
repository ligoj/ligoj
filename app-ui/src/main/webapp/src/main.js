import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import vuetify from './plugins/vuetify'

import PluginLoader from './plugins/PluginLoader'

// Register plugins (could be loaded from a config file)
// For local development, we point to the file path. In production, this might be a URL.
// PluginLoader.register('id', '../../../../../ligoj-plugins/plugin-id/src/main/resources/META-INF/resources/id/IdPlugin.vue')

// Sample: Register a plugin by URL (e.g. for production or remote loading)
// The URL should point to a JS module that default exports a Vue component or a configuration object.
PluginLoader.registerUrl('id', 'main/id/IdPlugin.vue')

const app = createApp(App)

app.use(createPinia())
app.use(vuetify)

// Expose PluginLoader to global properties or provide it
app.config.globalProperties.$pluginLoader = PluginLoader

app.mount('#app')
