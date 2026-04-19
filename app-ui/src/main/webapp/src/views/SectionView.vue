<template>
  <div class="d-flex flex-column align-center justify-center" style="min-height: 50vh">
    <v-icon size="96" color="primary" class="mb-4">mdi-compass-outline</v-icon>
    <h1 class="text-h4 mb-2">Page not found</h1>
    <p class="text-subtitle-1 text-medium-emphasis mb-6">
      The page <code>{{ route.path }}</code> does not exist or is under development.
    </p>
    <v-btn color="primary" variant="flat" prepend-icon="mdi-home" to="/">
      Back to Dashboard
    </v-btn>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.js'

const route = useRoute()
const appStore = useAppStore()

onMounted(() => {
  appStore.setTitle('Not Found')
  appStore.setBreadcrumbs([
    { title: 'Home', to: '/' },
    { title: 'Not Found' },
  ])
})
</script>
