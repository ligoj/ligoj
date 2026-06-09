import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue'

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
   * Components contributed by plugins for mounting in the app bar (next
   * to the user menu). Plugins call `registerHeaderItem(Component)`
   * during their `install()` — see `plugin-inbox-sql` for the
   * notification bell. The host's `AppLayout` iterates this array with
   * `<component :is>` so it never needs to import any plugin component
   * directly; an absent plugin → no mount → no polling.
   */
  const headerItems = ref([])
  /**
   * Optional handler the app-bar renders as a Refresh button next to
   * the breadcrumbs. Cleared on every `setBreadcrumbs` call so each
   * page re-opts in explicitly via `setBreadcrumbs(items, { refresh })`.
   */
  const refresh = ref(null)

  /**
   * Last breadcrumb FACTORY. When `setBreadcrumbs` is given a function instead
   * of an array, we keep it so `refreshBreadcrumbs()` can re-run it on a locale
   * change — the crumb titles use `t()` inside the factory and would otherwise
   * stay frozen in the language active at mount time. Plain-array callers stay
   * static (factory cleared).
   */
  let breadcrumbFactory = null

  function setBreadcrumbs(items, opts = {}) {
    breadcrumbFactory = typeof items === 'function' ? items : null
    breadcrumbs.value = breadcrumbFactory ? (breadcrumbFactory() || []) : items
    refresh.value = typeof opts.refresh === 'function' ? opts.refresh : null
    if (breadcrumbs.value.length) setTitle(breadcrumbs.value.slice(-1)[0].title)
  }

  /** Re-run the breadcrumb factory (if any) — call on locale change. */
  function refreshBreadcrumbs() {
    if (!breadcrumbFactory) return
    breadcrumbs.value = breadcrumbFactory() || []
    if (breadcrumbs.value.length) setTitle(breadcrumbs.value.slice(-1)[0].title)
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

  /**
   * Plugin hook: register a component to render in the app bar's
   * right-side stack. Wrapped in `markRaw` so Vue doesn't try to make
   * the component definition itself reactive — only the `headerItems`
   * array's identity needs to be reactive so `<component :is>` picks
   * up late additions (lazy-loaded plugins arrive after AppLayout
   * mounts). Re-registering the same component is a no-op to keep
   * hot-reload / double-install scenarios safe.
   */
  function registerHeaderItem(component) {
    if (!component || headerItems.value.includes(component)) return
    headerItems.value = [...headerItems.value, markRaw(component)]
  }

  return {
    sidebarOpen, title, appName, breadcrumbs, currentPlugin, refresh,
    headerItems,
    setBreadcrumbs, refreshBreadcrumbs, setRefresh, setTitle, setAppName, toggleSidebar,
    registerHeaderItem,
  }
})
