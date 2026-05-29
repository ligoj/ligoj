<template>
  <v-app>
    <AppLayout v-if="auth.isAuthenticated">
      <router-view />
    </AppLayout>
    <v-container v-else-if="auth.loading" class="d-flex align-center justify-center" style="min-height: 100vh">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-container>
    <ErrorSnackbar />
    <!-- Driven by `useAuthStore.authPromptOpen`. The flag is flipped by
         `useErrorStore.handleResponse` when an API call returns 401 +
         body `{redirect: "local"}` — the user re-authenticates in place
         instead of losing the page they're on. -->
    <LoginPromptDialog />
  </v-app>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { loadAllPlugins, pluginIdFromKey } from '@/plugins/loader.js'
import AppLayout from '@/layouts/AppLayout.vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'
import LoginPromptDialog from '@/components/LoginPromptDialog.vue'

const auth = useAuthStore()
const app = useAppStore()

/**
 * Plugins to skip during the bootstrap fan-out. Two categories:
 *
 *   1. Backend-only by design — Java-only contributors that decorate
 *      the session (`ISessionSettingsProvider`) or expose admin REST
 *      surfaces but never ship a Vue bundle.
 *        - `iam-empty`        — no-op IAM provider.
 *        - `iam-node`         — node-scoped IAM resolver.
 *        - `menu-node`        — feeds `userSettings.globalTools`; the
 *                               host's `GlobalToolsList` reads it
 *                               directly, no per-plugin code needed.
 *        - `welcome-data-rbac`— sample-data seeder.
 *
 *   2. Not migrated yet — plugins that still live on the legacy
 *      AMD/Handlebars stack and don't expose `vue/index.js`.
 *        - `prov-azure`       — provisioning, awaiting migration.
 *
 * Skipping the dynamic import for these avoids a guaranteed 404 in
 * the network panel on every session-refresh, since the host's
 * `auth.appSettings.plugins` still lists them as installed. Move
 * entries out of this set once a real Vue bundle lands; add new ones
 * here as backend-only plugins ship. The heavier alternative would be
 * a backend marker (e.g. an `ApplicationSettings.headlessPlugins`
 * array) — defer that until the deny list gets unwieldy.
 */
const NO_UI_PLUGINS = new Set([
  'iam-empty',
  'iam-node',
  'menu-node',
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
