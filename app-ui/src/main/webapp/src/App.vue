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
import AppLayout from '@/layouts/AppLayout.vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'

const auth = useAuthStore()

onMounted(async () => {
  const ok = await auth.fetchSession()
  if (!ok) {
    window.location.href = 'v-login.html'
    return
  }
  // Optional backend-listed plugins load lazily; required plugins are
  // pre-loaded in main.js so their routes exist before navigation.
  const optional = (auth.appSettings?.plugins || []).filter(id => id !== 'id')
  if (optional.length) loadAllPlugins(optional)
})
</script>
