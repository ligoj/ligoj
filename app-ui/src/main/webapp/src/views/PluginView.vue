<template>
  <div>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
      {{ t('error.pluginFailed') }}: {{ error }}
    </v-alert>
    <component :is="pluginComponent" v-else-if="pluginComponent" />
    <!-- 404 fallback when no plugin matches -->
    <div v-else-if="notFound" class="d-flex flex-column align-center justify-center" style="min-height: 50vh">
      <v-icon size="96" color="primary" class="mb-4">mdi-compass-outline</v-icon>
      <h1 class="text-h4 mb-2">{{ t('error.notFound') }}</h1>
      <p class="text-subtitle-1 text-medium-emphasis mb-6">
        {{ t('error.notFoundMsg') }}
      </p>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-home" to="/">
        {{ t('common.backHome') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import { loadPlugin } from '@/plugins/loader.js'
import registry from '@/plugins/registry.js'
import { useI18nStore } from '@/stores/i18n.js'

const route = useRoute()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const loading = ref(false)
const error = ref(null)
const notFound = ref(false)
const pluginComponent = shallowRef(null)

async function activate(path) {
  // Extract potential plugin key from the route path
  // e.g. /service/bt/jira → pluginKey = "service:bt:jira"
  const segments = path.replace(/^\/+/, '').split('/')
  if (!segments[0]) {
    notFound.value = true
    return
  }

  loading.value = true
  error.value = null
  notFound.value = false
  pluginComponent.value = null

  // Try plugin ID formats: "service:bt:jira", "service:bt", "service"
  const pluginId = segments.join(':')

  try {
    if (!registry.has(pluginId)) {
      await loadPlugin(pluginId)
    }
    const plugin = registry.get(pluginId)
    if (plugin?.component) {
      pluginComponent.value = plugin.component
      appStore.setTitle(plugin.label || pluginId)
      appStore.currentPlugin = pluginId
    } else {
      notFound.value = true
      appStore.setTitle('Not Found')
    }
  } catch {
    // Plugin doesn't exist — show 404
    notFound.value = true
    appStore.setTitle('Not Found')
    appStore.setBreadcrumbs([
      { title: 'Home', to: '/' },
      { title: 'Not Found' },
    ])
  } finally {
    loading.value = false
  }
}

watch(() => route.path, (path) => {
  // Only activate on catch-all routes (not named routes)
  if (route.name === 'not-found' || route.name === 'plugin') {
    activate(path)
  }
}, { immediate: true })
</script>
