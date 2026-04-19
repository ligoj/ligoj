<template>
  <v-app>
    <AppLayout v-if="auth.isAuthenticated">
      <router-view />
    </AppLayout>
    <v-container v-else-if="auth.loading" class="d-flex align-center justify-center" style="min-height: 100vh">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-container>
    <ErrorSnackbar />
  </v-app>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { loadAllPlugins } from '@/plugins/loader.js'
import { registerBuiltinPlugins } from '@/plugins/index.js'
import AppLayout from '@/layouts/AppLayout.vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'

const auth = useAuthStore()

// Register built-in plugin components before any dynamic loading
registerBuiltinPlugins()

onMounted(async () => {
  const ok = await auth.fetchSession()
  if (!ok) {
    window.location.href = 'v-login.html'
    return
  }
  // Load frontend plugins (silently ignores backend-only plugins without Vue UI)
  const pluginIds = auth.appSettings?.plugins || []
  if (pluginIds.length) {
    loadAllPlugins(pluginIds)
  }
})
</script>
