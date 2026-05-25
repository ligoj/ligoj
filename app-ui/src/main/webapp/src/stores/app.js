import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true)
  const title = ref('Ligoj')
  const breadcrumbs = ref([])
  const currentPlugin = ref(null)
  /**
   * Branding name used as the suffix of `document.title` and the
   * fallback when no page-specific title is set. Defaults to "Ligoj";
   * `App.vue` calls `setAppName(auth.appSettings.name)` after the
   * session resolves so a rebranded deployment sees its own value.
   */
  const appName = ref('Ligoj')
  /**
   * Optional handler the app-bar renders as a Refresh button next to
   * the breadcrumbs. Cleared on every `setBreadcrumbs` call so each
   * page re-opts in explicitly via `setBreadcrumbs(items, { refresh })`.
   */
  const refresh = ref(null)

  function setBreadcrumbs(items, opts = {}) {
    breadcrumbs.value = items
    refresh.value = typeof opts.refresh === 'function' ? opts.refresh : null
    if (items.length) setTitle(items.slice(-1)[0].title)
  }

  function setRefresh(fn) {
    refresh.value = typeof fn === 'function' ? fn : null
  }

  function setTitle(t) {
    title.value = t
    document.title = t ? `${t} - ${appName.value}` : appName.value
  }

  /**
   * Sync the brand suffix with the backend's `ApplicationSettings#name`.
   * Re-runs `setTitle` against the current page title so the browser
   * tab updates immediately — without that, the old "... - Ligoj"
   * suffix stays visible until the next breadcrumb push.
   */
  function setAppName(name) {
    const next = name || 'Ligoj'
    if (appName.value === next) return
    appName.value = next
    setTitle(title.value)
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    sidebarOpen, title, appName, breadcrumbs, currentPlugin, refresh,
    setBreadcrumbs, setRefresh, setTitle, setAppName, toggleSidebar,
  }
})
