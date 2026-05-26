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
import { useAppStore } from '@/stores/app.js'
import { loadAllPlugins, pluginIdFromKey } from '@/plugins/loader.js'
import AppLayout from '@/layouts/AppLayout.vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'

const auth = useAuthStore()
const app = useAppStore()

/**
 * Backend-only plugins. These ship Java only and intentionally have no
 * Vue bundle to load — distinct from "not migrated yet" plugins like
 * `iam-node` / `prov-azure`, which will eventually have one. Skipping
 * the dynamic import for these avoids a guaranteed 404 in the network
 * panel on every session-refresh, since the host's
 * `auth.appSettings.plugins` still lists them as installed.
 *
 * Add new no-UI plugins here as they land — the alternative would be a
 * backend marker (e.g. an `ApplicationSettings.headlessPlugins` array)
 * which is heavier than this 1-liner.
 */
const NO_UI_PLUGINS = new Set([
  'iam-empty',
  'iam-node',
  'welcome-data-rbac',
])

onMounted(async () => {
  const ok = await auth.fetchSession()
  if (!ok) {
    auth.redirectToLogin()
    return
  }
  // Push the backend's `ApplicationSettings#name` into the app store so
  // `document.title` gets the right brand suffix on every page. The
  // store defaults to "Ligoj" before this fires, which keeps the boot
  // window's tab title sane.
  app.setAppName(auth.appSettings?.name)
  // Optional backend-listed plugins load lazily; required plugins are
  // pre-loaded in main.js so their routes exist before navigation.
  // `appSettings.plugins` is a list of `FeaturePlugin.getKey()` values
  // (e.g. `service:id:ldap`) — normalise them to the short, URL-safe form
  // the loader accepts before passing them through. Backend-only plugins
  // (see `NO_UI_PLUGINS`) are filtered out so we never even attempt the
  // dynamic import.
  const optional = (auth.appSettings?.plugins || [])
    .map(pluginIdFromKey)
    .filter(id => id && id !== 'id' && !NO_UI_PLUGINS.has(id))
  if (optional.length) loadAllPlugins(optional)
})
</script>
