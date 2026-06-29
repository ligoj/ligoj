<template>
  <div class="shell" :class="{ 'nav-collapsed': collapsed }">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="brand" @click="go('/')">
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" class="brand-logo">
          <defs>
            <path d="M20 70 C20 70 2 87 8 118 C16 155 53 155 53 155 L53 117 C53 117 46 117 42 112 C36 104 40 96 40 96 L20 70Z" id="l1" />
            <path d="M53 117L129 117L129 155L53 155L53 117Z" id="l2" />
            <path d="M151 117L131 117L131 155L151 155L151 117Z" id="l3" />
            <path d="M53 10L91 10L91 117L53 117L53 10Z" id="l4" />
          </defs>
          <use fill="#034b80" href="#l2" />
          <use fill="#ff6900" href="#l3" />
          <use fill="#4589ca" href="#l4" />
          <use fill="#ff6900" href="#l1" />
        </svg>
        <span class="brand-word">{{ appName }}</span>
      </div>
      <nav class="nav">
        <template v-for="it in NAV" :key="it.label">
          <a class="nav-item" :class="{ active: isNavActive(it), 'has-children': it.children }" @click="onNavClick(it)">
            <v-icon>{{ it.icon }}</v-icon>
            <span>{{ it.label }}</span>
            <span v-if="it.soon" class="soon">bientôt</span>
            <v-icon v-if="it.children" class="nav-caret" :class="{ open: isOpen(it) }" size="18">mdi-chevron-down</v-icon>
          </a>
          <!-- Sub-menu (e.g. Identité → Utilisateurs / Groupes / …); expand
               state is manual (toggled by clicking the parent). -->
          <div v-if="it.children && isOpen(it)" class="subnav">
            <template v-for="c in it.children" :key="c.label">
              <div v-if="c.divider" class="sub-sep"><span>{{ c.divider }}</span></div>
              <a class="sub-item" :class="{ active: c.route === route.path || (c.match && route.path.startsWith(c.match)) }" @click="c.route ? go(c.route) : toast()">
                <LigojIcon v-if="c.icon" :icon="c.icon" size="16" />
                <span v-else class="dot" />
                <span>{{ c.label }}</span>
                <span v-if="c.soon" class="soon">bientôt</span>
              </a>
            </template>
          </div>
        </template>
      </nav>
      <div class="sb-foot">
        <button class="ver" :class="{ active: route.path === '/about' }" @click="go('/about')"><v-icon size="14">mdi-information-outline</v-icon><span>{{ i18n.t('nav.about') }}</span><span
            v-if="appVersion" class="ver-num">{{ appVersion }}</span></button>
        <button class="foot-bug" :aria-label="i18n.t('about.reportBug')" @click="app.openBugDialog()"><v-icon size="18">mdi-bug-outline</v-icon><v-tooltip activator="parent" location="top" :text="i18n.t('about.reportBug')" /></button>
      </div>
    </aside>

    <!-- App bar -->
    <header class="bar">
      <button class="icon-btn" @click="collapsed = !collapsed" title="Menu"><v-icon>mdi-menu</v-icon></button>
      <!-- The single breadcrumb, in the 2026 chip style (relocated here from the
           per-view LjPageHeader, which no longer renders its own trail). -->
      <nav class="bcrumbs" aria-label="breadcrumb">
        <template v-for="(c, i) in displayCrumbs" :key="i">
          <span v-if="i" class="bc-sep">›</span>
          <a v-if="c.to && i < displayCrumbs.length - 1" class="bc-chip link" @click="go(c.to)">
            <v-icon v-if="crumbIcon(c, false)" size="13">{{ crumbIcon(c, false) }}</v-icon>{{ c.title }}
          </a>
          <span v-else class="bc-chip" :class="{ cur: i === displayCrumbs.length - 1 }">
            <v-icon v-if="crumbIcon(c, i === displayCrumbs.length - 1)" size="13">{{ crumbIcon(c, i === displayCrumbs.length - 1) }}</v-icon>{{ c.title }}
          </span>
        </template>
      </nav>
      <button v-if="app.refresh" class="icon-btn refresh-btn" :class="{ spin: refreshing }" title="Rafraîchir" @click="onRefresh"><v-icon>mdi-refresh</v-icon></button>
      <span class="sp" />
      <button class="user" :class="{ admin: auth.isAdmin }" @click="go('/profile')"><v-icon size="small" :color="auth.isAdmin ? 'secondary' : undefined">{{ auth.isAdmin ? 'mdi-shield-account' :
          'mdi-account' }}</v-icon>{{ auth.userName || 'invité' }}<v-tooltip v-if="auth.isAdmin" activator="parent" location="bottom" :text="i18n.t('profile.adminTooltip')" /></button>
      <button class="icon-btn" title="Se déconnecter" @click="logout"><v-icon>mdi-logout</v-icon></button>
    </header>

    <main class="main"><router-view /></main>

    <div class="toast" :class="{ show: toastMsg }">{{ toastMsg }}</div>
    <ErrorSnackbar />
    <!-- Persistent plugin-contributed mounts (e.g. plugin-ui's BugReportDialog
         and LoginPromptDialog). They are v-dialogs teleported to <body>, so
         this location only keeps them alive; they self-bind to their store
         flags (app.bugDialogOpen / auth.authPromptOpen). -->
    <component :is="item" v-for="(item, i) in app.headerItems" :key="i" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'
import { loadAllPlugins, pluginIdFromKey } from '@/plugins/loader.js'
import registry from '@/plugins/registry.js'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'
import LigojIcon from '@/components/LigojIcon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()
const i18n = useI18nStore()
const appName = computed(() => auth.appSettings?.name || 'Ligoj')
const appVersion = computed(() => auth.appSettings?.buildVersion || '')

// Each page re-opts into the bar breadcrumbs/refresh via setBreadcrumbs() in
// its onMounted; clear on every navigation so a page that doesn't set them
// (Dashboard, Profil) falls back to the plain title instead of showing the
// previous page's trail.
router.beforeEach(() => { app.setBreadcrumbs([]) })

// Backend-only plugins (no Vue bundle) — skip to avoid guaranteed 404s on
// every session refresh. Mirrors app-ui's App.vue NO_UI_PLUGINS deny list.
const NO_UI_PLUGINS = new Set(['iam-empty', 'iam-node', 'menu-node', 'welcome-data-rbac'])

// Lazily load the remaining installed plugins (the core 'id'/'ui'/'prov' are
// already loaded eagerly in main.js). `appSettings.plugins` lists FeaturePlugin
// keys (e.g. 'service:id:ldap') — normalise to the loader's short id form.
// Breadcrumb titles are resolved at the view's mount time; re-run the active
// view's breadcrumb factory when the language changes so they re-localize
// (the sidebar NAV + page content already react via their own `t()` calls).
watch(() => i18n.locale, () => app.refreshBreadcrumbs())

onMounted(async () => {
  const ok = await auth.fetchSession()
  if (!ok) { auth.redirectToLogin(); return }
  app.setAppName(auth.appSettings?.name)
  const optional = (auth.appSettings?.plugins || [])
    .map(pluginIdFromKey)
    .filter((id) => id && id !== 'id' && !NO_UI_PLUGINS.has(id))
  if (optional.length) loadAllPlugins(optional)
})

// `labelKey` (not a literal `label`) so the sidebar localizes reactively — the
// NAV computed resolves it through `i18n.t()` (which tracks the active locale).
// `auth` is the backend resource path tested against the session's
// `uiAuthorizations` regexes (see auth.isAllowed) to drop links the user
// can't reach. It deliberately diverges from the SPA `route` where the REST
// tree differs from the UI path — e.g. the /id/group view is gated by
// `id/container/group`, /id/scope by `id/container-scope`. Mirrors the
// store's NAV_CONFIG mapping.
const BASE_NAV = [
  { labelKey: 'nav.home', icon: 'mdi-home', route: '/', auth: 'home' },
  // `match` makes the item active across a whole section; `children` render
  // a sub-menu while the section is active.
  {
    labelKey: 'nav.identity', icon: 'mdi-account-group', match: '/id', children: [
      { labelKey: 'nav.users', icon: 'mdi-account', route: '/id/user', match: '/id/user', auth: 'id/user' },
      { labelKey: 'nav.groups', icon: 'mdi-account-group', route: '/id/group', match: '/id/group', auth: 'id/container/group' },
      { labelKey: 'nav.companies', icon: 'mdi-domain', route: '/id/company', match: '/id/company', auth: 'id/container/company' },
      { labelKey: 'nav.delegates', icon: 'mdi-account-arrow-right', route: '/id/delegate', match: '/id/delegate', auth: 'id/delegate' },
      { labelKey: 'nav.containerScopes', icon: 'mdi-file-tree', route: '/id/scope', match: '/id/scope', auth: 'id/container-scope' },
    ]
  },
  { labelKey: 'nav.projects', icon: 'mdi-folder', route: '/project', match: '/project', auth: 'home' },
  {
    labelKey: 'nav.system', icon: 'mdi-cog', match: '/system', children: [
      { labelKey: 'nav.plugins', icon: 'mdi-puzzle', route: '/system/plugin', match: '/system/plugin', auth: 'system/plugin' },
      { labelKey: 'nav.nodes', icon: 'mdi-server-network', route: '/system/node', match: '/system/node', auth: 'system/node' },
      { labelKey: 'nav.configuration', icon: 'mdi-cog-outline', route: '/system/configuration', match: '/system/configuration', auth: 'system/configuration' },
      { labelKey: 'nav.hooks', icon: 'mdi-webhook', route: '/system/hook', match: '/system/hook', auth: 'system/hook' },
      { labelKey: 'nav.roles', icon: 'mdi-shield-account', route: '/system/role', match: '/system/role', auth: 'system/role' },
      { labelKey: 'nav.systemUsers', icon: 'mdi-account-supervisor', route: '/system/user', match: '/system/user', auth: 'system/user' },
      { labelKey: 'nav.cache', icon: 'mdi-database-clock', route: '/system/cache', match: '/system/cache', auth: 'system/cache' },
      { labelKey: 'nav.bench', icon: 'mdi-speedometer', route: '/system/bench', match: '/system/bench', auth: 'system/bench' },
      { labelKey: 'nav.information', icon: 'mdi-information', route: '/system/information', match: '/system/information', auth: 'system' },
    ]
  },
  // API (Explorer + Tokens) is intentionally not in the sidebar — it's reached
  // from the About page's Resources card. The /api and /api/token routes still
  // exist (registered by plugin-ui).
]

/**
 * Plugin contributions to the Administration menu, via the `renderAdmin`
 * render-delegation feature. The 2026 redesign rebuilt the sidebar from a
 * static NAV array and dropped the old `AdminNavExtras` mount, so these
 * vanished — this restores them the 2026 way.
 *
 * Each contributing plugin returns `<v-list-item>` VNodes built with
 * `h(VListItem, { prependIcon, title, to })`; we read those props off the
 * VNodes and turn them into native sidebar sub-items (so they get the 2026
 * `.sub-item` styling + active-state logic, instead of an off-theme Vuetify
 * list). `registry.version` + `i18n.locale` are read for reactivity, so a
 * plugin loaded lazily after first paint (or a locale switch) re-runs this.
 */
const pluginAdminChildren = computed(() => {
  void registry.version.value
  void i18n.locale
  const items = []
  for (const plugin of registry.list()) {
    if (typeof plugin?.feature !== 'function') continue
    let out
    try {
      out = plugin.feature('renderAdmin')
    } catch (err) {
      if (!/no feature ["']renderAdmin["']/.test(err?.message || '')) {
        console.warn(`[App] ${plugin.id}.renderAdmin threw`, err)
      }
      continue
    }
    if (out == null) continue
    // Each contributing plugin's entries are preceded by a labeled divider
    // carrying the plugin's display name (its "ownership notice"), so admins
    // see which plugin owns the entries below it.
    const owner = plugin.label || plugin.id
    let first = true
    for (const node of Array.isArray(out) ? out.filter(Boolean) : [out]) {
      const p = node?.props
      if (!p?.to) continue
      items.push({
        label: p.title || p.to,
        icon: p.prependIcon || 'mdi-circle-small',
        route: p.to,
        match: p.to,
        ...(first ? { divider: owner } : {}),
      })
      first = false
    }
  }
  return items
})

/**
 * Resource path tested against the session's `uiAuthorizations`. Static items
 * carry an explicit `auth` (the REST tree path, which can diverge from the SPA
 * route); plugin-contributed admin entries fall back to their route with the
 * leading slash stripped.
 */
function authKey(it) {
  return it.auth ?? String(it.route || it.match || '').replace(/^\//, '')
}
const allowed = (it) => auth.isAllowed(authKey(it))

const NAV = computed(() => {
  void i18n.locale // re-localize the labels when the language changes
  // Drop links pointing to routes the user can't reach (per uiAuthorizations);
  // admins bypass the check (auth.isAllowed). A parent section is kept only
  // while at least one of its children survives the filter.
  return BASE_NAV.map((it) => {
    const out = { ...it, label: i18n.t(it.labelKey) }
    if (it.children) {
      const kids = it.children
        .filter(allowed)
        .map((c) => ({ ...c, label: i18n.t(c.labelKey) }))
      const extra = it.match === '/system' ? pluginAdminChildren.value.filter(allowed) : []
      out.children = extra.length ? [...kids, ...extra] : kids
    }
    return out
  }).filter((it) => (it.children ? it.children.length > 0 : allowed(it)))
})

const collapsed = ref(false)
const title = computed(() => {
  if (route.path === '/profile') return 'Profil'
  if (route.path.startsWith('/id/group')) return 'Groupes'
  if (route.path.startsWith('/id/company')) return 'Entités'
  if (route.path.startsWith('/id/delegate')) return 'Délégués'
  if (route.path.startsWith('/id/scope')) return 'Portées'
  if (route.path.startsWith('/id')) return 'Utilisateurs'
  if (route.path.startsWith('/project')) return 'Projets'
  if (route.path.startsWith('/system/plugin')) return 'Plugins'
  if (route.path.startsWith('/system/node')) return 'Nœuds'
  if (route.path.startsWith('/system/configuration')) return 'Configuration'
  if (route.path.startsWith('/system/hook')) return 'Hooks'
  if (route.path.startsWith('/system/role')) return 'Rôles'
  if (route.path.startsWith('/system/user')) return 'Utilisateurs système'
  if (route.path.startsWith('/system/cache')) return 'Cache'
  if (route.path.startsWith('/system/bench')) return 'Bench'
  if (route.path.startsWith('/system/information')) return 'Information'
  if (route.path.startsWith('/system')) return 'Administration'
  if (route.path.startsWith('/api/token')) return 'Jetons d\'API'
  if (route.path.startsWith('/api')) return 'API'
  if (route.path.startsWith('/about')) return 'À propos'
  return 'Accueil'
})
function isNavActive(it) {
  return it.match ? route.path.startsWith(it.match) : it.route === route.path
}

// Sub-menu expand/collapse is manual: clicking a parent toggles its section
// (re-clicking an open section collapses it). The section you're currently in
// auto-opens on navigation so the active page is always revealed.
const openSections = reactive({})
function isOpen(it) { return !!(it.children && openSections[it.label]) }
function onNavClick(it) {
  if (it.children) {
    if (openSections[it.label]) {
      openSections[it.label] = false
    } else {
      openSections[it.label] = true
      if (it.children[0]?.route) go(it.children[0].route)
    }
  } else if (it.route) {
    go(it.route)
  } else {
    toast()
  }
}
watch(() => route.path, () => {
  for (const it of NAV.value) if (it.children && isNavActive(it)) openSections[it.label] = true
}, { immediate: true })

function go(path) { if (route.path !== path) router.push(path) }

// Bar breadcrumb trail: the page-provided crumbs when present, else a single
// crumb from the local title map (Dashboard/Profil don't set breadcrumbs).
const displayCrumbs = computed(() => (app.breadcrumbs.length ? app.breadcrumbs : [{ title: title.value }]))

/* Breadcrumb chip icon — every crumb, INCLUDING the leaf (current page).
 * Resolution order:
 *  1. an explicit `icon` on the crumb (e.g. About);
 *  2. the home crumb → a home glyph;
 *  3. the leaf (current page) → its icon from the sidebar NAV tree, matched by
 *     the active route (covers /system/plugin → Plug-ins, /prov/catalog →
 *     Catalog, /id/user → Utilisateurs, ...);
 *  4. a section crumb → the well-known roots (System / API), else the NAV group
 *     owning the route, else the owning plugin's `meta.icon` (e.g. Provisioning
 *     → plugin-prov's mdi-server-network). */
function navIconForPath(path) {
  let best = null
  let bestLen = -1
  for (const g of NAV.value) {
    for (const e of [g, ...(g.children || [])]) {
      const key = e.match || e.route
      if (!key) continue
      if (path === e.route || path === e.match || (e.match && path.startsWith(e.match + '/'))) {
        if (key.length > bestLen) { best = e; bestLen = key.length }
      }
    }
  }
  return best ? best.icon : null
}
function crumbIcon(c, isLeaf) {
  if (c.icon) return c.icon
  if (c.to === '/') return 'mdi-home-outline'
  if (isLeaf) {
    const leaf = navIconForPath(route.path)
    if (leaf) return leaf
  }
  if (c.title === i18n.t('system.breadcrumb')) return 'mdi-cog-outline'
  if (c.title === i18n.t('api.title')) return 'mdi-api'
  const group = NAV.value.find((g) => g.match && (route.path === g.match || route.path.startsWith(g.match + '/')))
  if (group) return group.icon
  const pluginId = route.path.split('/').filter(Boolean)[0]
  const plugin = pluginId ? registry.get(pluginId) : null
  return plugin?.meta?.icon || null
}
const refreshing = ref(false)
async function onRefresh() {
  if (!app.refresh || refreshing.value) return
  refreshing.value = true
  try { await app.refresh() } catch { /* page surfaces its own error */ }
  setTimeout(() => { refreshing.value = false }, 600)
}

function logout() {
  // Top-level nav to Spring's /logout — let the success handler
  // pick the right landing page (Keycloak end-session → app, or
  // login page for non-OIDC). Same contract as the legacy shell.
  auth.logout()
}

let toastT
const toastMsg = ref('')
function toast(msg = 'Page à venir dans la refonte') {
  toastMsg.value = msg
  clearTimeout(toastT)
  toastT = setTimeout(() => (toastMsg.value = ''), 2200)
}
</script>

<style>
/* Global: Vibrant display font across the whole UI-2026 app. This app is
   standalone, so applying it globally is safe (the current app-ui is a
   separate project and untouched). */
/* The shell font tokens defer to the active style's `--lj-font` / `--lj-mono`
 * (defined per `[data-style]` in assets/vuetify-overrides.css) so the sidebar,
 * brand, breadcrumbs and user menu re-typeface with the theme. The literals
 * are the fallback when no style attribute is set. */
:root {
  --v26-font: var(--lj-font, "Bricolage Grotesque", system-ui, sans-serif);
  --v26-sys: var(--lj-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --v26-mono: var(--lj-mono, "JetBrains Mono", ui-monospace, monospace);
}

html,
body,
#app {
  margin: 0;
  height: 100%;
}

body {
  font-family: var(--v26-sys);
  background: rgb(var(--v-theme-background));
}

.v-application,
.v-navigation-drawer,
.v-app-bar {
  font-family: var(--v26-sys);
}

/* ---- Vibrant re-skin of Vuetify select / autocomplete dropdown menus ----
   These overlays teleport to <body>, outside any view scope, so they're
   styled globally here. Rounded panel, soft shadow, Bricolage font, rounded
   hover/active items — so picking from a list matches the 2026 look. */
.v-select__content,
.v-autocomplete__content,
.v-combobox__content {
  border-radius: var(--lj-radius, 14px) !important;
  box-shadow: var(--lj-shadow-lg, 0 18px 48px -16px rgba(0, 0, 0, .5)) !important;
  border: 1px solid var(--lj-border-color, rgba(var(--v-theme-on-surface), .12));
  overflow: hidden;
}

.v-select__content .v-list,
.v-autocomplete__content .v-list,
.v-combobox__content .v-list {
  background: rgb(var(--v-theme-surface)) !important;
  padding: 6px !important;
  font-family: var(--lj-font, var(--v26-font));
}

.v-select__content .v-list-item,
.v-autocomplete__content .v-list-item,
.v-combobox__content .v-list-item {
  border-radius: var(--lj-radius-sm, 9px) !important;
  min-height: 42px !important;
  margin-bottom: 2px;
}

.v-select__content .v-list-item-title,
.v-autocomplete__content .v-list-item-title,
.v-combobox__content .v-list-item-title {
  font-family: var(--v26-font);
  font-weight: 600;
  font-size: 13.5px;
}

/* Selected option → warm accent tint. */
.v-select__content .v-list-item--active,
.v-autocomplete__content .v-list-item--active,
.v-combobox__content .v-list-item--active {
  color: #ff5a52;
  background: rgba(255, 90, 82, .1);
}

.v-select__content .v-list-item--active .v-list-item__overlay,
.v-autocomplete__content .v-list-item--active .v-list-item__overlay {
  opacity: 0;
}
</style>

<style scoped>
.shell {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --muted: rgba(var(--v-theme-on-surface), .6);
  --line: rgba(var(--v-theme-on-surface), .12);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --primary: rgb(var(--v-theme-primary));
  --on-primary: rgb(var(--v-theme-on-primary));
  --w: 264px;
  --h: 56px;
  min-height: 100vh;
  color: var(--ink);
  background: rgb(var(--v-theme-background));
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--w);
  z-index: 30;
  display: flex;
  flex-direction: column;
  color: var(--on-primary);
  background: linear-gradient(180deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000));
  transition: transform .22s ease;
}

/* Material You: the MD3 primary is a LIGHT tone (notably in dark mode), which
   washes out the rail under its white nav text. Use a dark MD3 neutral
   navigation rail instead, for both md3 light and dark — and force a light
   inherited text color (the `.ver` "À propos" button inherits it; otherwise it
   resolves to the dark `--on-primary` of the light MD3 primary → black text). */
[data-style="md3"] .sidebar {
  background: linear-gradient(180deg, #211f26, #16141b);
  color: rgba(255, 255, 255, .92);
}

.nav-collapsed .sidebar {
  transform: translateX(-100%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  cursor: pointer;
}

.brand-logo {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, .25));
}

.brand-word {
  font-family: var(--v26-font);
  font-weight: 800;
  font-size: 20px;
  letter-spacing: -.02em;
}

.nav {
  padding: 10px;
  flex: 1;
  /* min-height:0 lets this flex child shrink below its content height so it can
     scroll instead of pushing .sb-foot off-screen on short viewports. */
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, .35) transparent;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--lj-radius-sm, 10px);
  cursor: pointer;
  font-family: var(--v26-font);
  font-weight: 600;
  font-size: 14px;
  color: rgba(255, 255, 255, .86);
  margin-bottom: 2px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, .08);
}

.nav-item.active {
  background: rgba(255, 255, 255, .16);
  color: #fff;
}

.nav-item .soon {
  margin-left: auto;
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, .16);
}

.nav-item .nav-caret {
  margin-left: auto;
  color: rgba(255, 255, 255, .5);
  transition: transform .2s, color .15s;
}

.nav-item .nav-caret.open {
  transform: rotate(180deg);
  color: rgba(255, 255, 255, .85);
}

.nav-item.has-children:hover .nav-caret {
  color: rgba(255, 255, 255, .9);
}

.nav-item.has-children .soon+.nav-caret {
  margin-left: 6px;
}

.subnav {
  margin: 2px 0 6px;
  padding-left: 14px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sub-sep {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 12px 3px 6px;
  font-family: var(--v26-font);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, .42);
}

.sub-sep::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, .12);
}

.sub-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--lj-radius-sm, 9px);
  cursor: pointer;
  font-family: var(--v26-font);
  font-weight: 600;
  font-size: 13px;
  color: rgba(255, 255, 255, .74);
}

.sub-item:hover {
  background: rgba(255, 255, 255, .07);
  color: #fff;
}

.sub-item.active {
  background: rgba(255, 255, 255, .14);
  color: #fff;
}

.sub-item .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: .6;
  flex: none;
}

.sub-item .soon {
  margin-left: auto;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 20px;
  background: rgba(255, 255, 255, .14);
}

.sb-foot {
  padding: 10px 8px;
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Bug-report trigger, sitting to the right of the version number next to the
   About item (moved here from the top bar). Tinted orange so it stays visible
   against every themed sidebar. `flex: none` keeps it from stealing room from
   the version; the Reforged (`ligoj-classic`) theme's white-icon rule is
   overridden in vuetify-overrides.css so the orange survives there too. */
.foot-bug {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: #ff8c42;
  cursor: pointer;
  border-radius: 8px;
  transition: color .15s, background .15s;
}

.foot-bug:hover {
  color: #ffa45c;
  background: rgba(255, 140, 66, .15);
}

.ver {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  /* Keep "About" + version on a single line: the wider mono fonts used by the
     sharp / neon styles otherwise overflow the footer width and wrap to two
     lines. */
  white-space: nowrap;
  text-align: left;
  font-family: var(--v26-font);
  font-weight: 600;
  font-size: 13px;
  opacity: .7;
  padding: 9px 8px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 8px;
  transition: opacity .15s, background .15s;
}

.ver:hover {
  opacity: .9;
  background: rgba(255, 255, 255, .08);
}

.ver.active {
  opacity: 1;
  background: rgba(255, 255, 255, .12);
}

/* App version — thin, dimmed, pushed to the right edge of the button. Shrinks
   with an ellipsis as a last resort so it never forces a wrap. */
.ver-num {
  margin-left: auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 200;
  font-size: 11px;
  opacity: .7;
  font-family: var(--v26-mono, var(--v26-font));
  letter-spacing: .01em;
}

.bar {
  position: fixed;
  top: 0;
  left: var(--w);
  right: 0;
  height: var(--h);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .06);
  transition: left .22s ease;
}

.nav-collapsed .bar {
  left: 0;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  border-radius: 9px;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--ink);
}

.icon-btn:hover {
  background: var(--hover);
}

.crumb {
  font-family: var(--v26-font);
  font-weight: 700;
  font-size: 16px;
  color: var(--ink);
  letter-spacing: -.01em;
}

.bcrumbs {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
  padding-left: 4px;
}

/* 2026 chip-style breadcrumb (relocated from LjPageHeader). */
.bc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--v26-font);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), .6);
  background: rgba(var(--v-theme-on-surface), .07);
  border-radius: 999px;
  padding: 4px 11px;
  transition: color .14s, background .14s;
}

a.bc-chip.link {
  cursor: pointer;
}

a.bc-chip.link:hover {
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), .13);
}

.bc-chip.cur {
  color: rgb(var(--v-theme-secondary));
  background: rgba(var(--v-theme-secondary), .14);
}

.bc-sep {
  color: rgba(var(--v-theme-on-surface), .4);
  font-size: 13px;
}

.refresh-btn .v-icon {
  transition: transform .2s;
}

.refresh-btn:hover .v-icon {
  color: rgb(var(--v-theme-secondary));
}

.refresh-btn.spin .v-icon {
  animation: bc-spin .6s ease;
}

@keyframes bc-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .refresh-btn.spin .v-icon {
    animation: none;
  }
}

.sp {
  flex: 1;
}

.user {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border: 0;
  background: transparent;
  border-radius: 9px;
  cursor: pointer;
  color: var(--ink);
  font-family: var(--v26-font);
  font-weight: 600;
  font-size: 14px;
}

.user:hover {
  background: var(--hover);
}

.main {
  margin-left: var(--w);
  padding: calc(var(--h) + 24px) 28px 34px;
  transition: margin-left .22s ease;
}

.nav-collapsed .main {
  margin-left: 0;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(16px);
  background: var(--ink);
  color: var(--surface);
  padding: 11px 18px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  z-index: 60;
  opacity: 0;
  transition: .25s;
  pointer-events: none;
  box-shadow: 0 12px 30px -10px rgba(0, 0, 0, .5);
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .bar {
    left: 0;
  }

  .main {
    margin-left: 0;
  }
}
</style>
