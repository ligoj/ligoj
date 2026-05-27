<template>
  <v-navigation-drawer v-model="appStore.sidebarOpen" :temporary="mobile" app color="primary" dark>
    <v-list-item @click="router.push('/')" class="pa-4">
      <template #prepend>
        <img src="@/assets/ligoj.svg" :alt="appName" style="width: 32px; height: 32px; margin-right: 8px" />
      </template>
      <v-list-item-title class="text-h6 font-weight-bold">{{ appName }}</v-list-item-title>
    </v-list-item>
    <v-divider />
    <v-list density="compact" nav :opened="openedGroups">
      <template v-for="item in auth.navItems" :key="item.id">
        <v-list-item v-if="!item.children" :prepend-icon="item.icon" :title="item.labelKey ? t(item.labelKey) : item.label" :to="item.route" />
        <v-list-group v-else :value="item.id">
          <template #activator="{ props }">
            <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.labelKey ? t(item.labelKey) : item.label" />
          </template>
          <v-list-item v-for="child in item.children" :key="child.id" :prepend-icon="child.icon" :title="child.labelKey ? t(child.labelKey) : child.label" :to="child.route" />
        </v-list-group>
      </template>
    </v-list>
    <template #append>
      <v-divider />
      <v-list density="compact" nav>
        <!-- Build version inlined on the "About" row to save vertical
             space — sits in the row's append slot so it doesn't push
             the title down or take its own row. Same `/about` route
             still owns the full version / git / plugin details. -->
        <v-list-item prepend-icon="mdi-information-outline" :title="t('nav.about')" to="/about">
          <template #append>
            <span class="ligoj-version">v{{ auth.appSettings.buildVersion || '?' }}</span>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>

  <v-app-bar app density="compact" elevation="1">
    <v-app-bar-nav-icon @click="appStore.toggleSidebar()" />
    <div class="d-flex align-center flex-grow-1 min-width-0">
      <v-breadcrumbs v-if="appStore.breadcrumbs.length" :items="appStore.breadcrumbs" class="pa-0" />
      <v-btn v-if="appStore.refresh" icon size="small" variant="text" class="ml-1" :loading="refreshing" :title="t('nav.refresh')" @click="doRefresh">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>
    <v-spacer />
    <!-- Plugin-contributed app-bar items. Each plugin pushes its
         component via `app.registerHeaderItem(...)` during install;
         AppLayout has no idea what's in here, so an install without
         the contributing plugin just renders nothing — no polling,
         no 401, no badge. The notification bell from plugin-inbox-sql
         is the first user of this slot. -->
    <component :is="item" v-for="(item, i) in appStore.headerItems" :key="i" />
    <v-btn variant="text" prepend-icon="mdi-account" @click="router.push('/profile')">
      <span class="d-none d-sm-inline">{{ auth.userName }}</span>
    </v-btn>
    <v-btn icon @click="doLogout" :title="t('nav.logout')">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>

  <v-main>
    <v-container fluid>

      <slot />
    </v-container>
  </v-main>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'

const router = useRouter()
const route = useRoute()
const { mobile } = useDisplay()
const auth = useAuthStore()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

/**
 * Display name shown in the sidebar brand. Sourced from the backend's
 * `ApplicationSettings#name` (driven by the `ligoj.name` property);
 * falls back to "Ligoj" when the session hasn't loaded yet or the
 * backend pre-dates the field.
 */
const appName = computed(() => auth.appSettings?.name || 'Ligoj')

/** Auto-expand sidebar groups whose children match the current route */
const openedGroups = computed(() => {
  return auth.navItems
    .filter(item => item.children?.some(child => route.path.startsWith(child.route)))
    .map(item => item.id)
})

watchEffect(() => {
  if (mobile.value) appStore.sidebarOpen = false
})

function doLogout() {
  // `auth.logout()` does the top-level navigation to /logout. Don't
  // race it with a local nav — Spring's success handler decides where
  // we land (Keycloak end-session → app, or login page for non-OIDC).
  auth.logout()
}

const refreshing = ref(false)
async function doRefresh() {
  const fn = appStore.refresh
  if (!fn || refreshing.value) return
  refreshing.value = true
  try { await fn() } finally { refreshing.value = false }
}
</script>

<style scoped>
/* Smaller-than-caption font for the inline version label on the About
 * row. Vuetify's default `text-caption` is still too prominent here —
 * we want the version visible for bug reports but not competing with
 * the "About" label for attention. */
.ligoj-version {
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  opacity: 0.7;
}
</style>
