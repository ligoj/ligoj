<template>
  <!-- Login is full-bleed: render it bare, without the app shell. -->
  <router-view v-if="isLogin" />

  <div v-else class="shell" :class="{ 'nav-collapsed': collapsed }">
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
          <use fill="#034b80" href="#l2" /><use fill="#ff6900" href="#l3" />
          <use fill="#4589ca" href="#l4" /><use fill="#ff6900" href="#l1" />
        </svg>
        <span class="brand-word">Ligoj</span>
      </div>
      <nav class="nav">
        <template v-for="it in NAV" :key="it.label">
          <a class="nav-item" :class="{ active: isNavActive(it), 'has-children': it.children }"
            @click="onNavClick(it)">
            <v-icon>{{ it.icon }}</v-icon>
            <span>{{ it.label }}</span>
            <span v-if="it.soon" class="soon">bientôt</span>
            <v-icon v-if="it.children" class="nav-caret" :class="{ open: isOpen(it) }" size="18">mdi-chevron-down</v-icon>
          </a>
          <!-- Sub-menu (e.g. Identité → Utilisateurs / Groupes / …); expand
               state is manual (toggled by clicking the parent). -->
          <div v-if="it.children && isOpen(it)" class="subnav">
            <a v-for="c in it.children" :key="c.label" class="sub-item" :class="{ active: c.route === route.path || (c.match && route.path.startsWith(c.match)) }"
              @click="c.route ? go(c.route) : toast()">
              <span class="dot" />
              <span>{{ c.label }}</span>
              <span v-if="c.soon" class="soon">bientôt</span>
            </a>
          </div>
        </template>
      </nav>
      <div class="sb-foot">
        <a class="nav-item" :class="{ active: route.path === '/profile' }" @click="go('/profile')">
          <v-icon>mdi-account-circle</v-icon><span>Profil</span>
        </a>
        <div class="ver">UI 2026 · aperçu</div>
      </div>
    </aside>

    <!-- App bar -->
    <header class="bar">
      <button class="icon-btn" @click="collapsed = !collapsed" title="Menu"><v-icon>mdi-menu</v-icon></button>
      <nav class="bcrumbs" aria-label="breadcrumb">
        <template v-for="(c, i) in displayCrumbs" :key="i">
          <span v-if="i" class="bc-sep">›</span>
          <a v-if="c.to && i < displayCrumbs.length - 1" class="bc link" @click="go(c.to)">{{ c.title }}</a>
          <span v-else class="bc" :class="{ cur: i === displayCrumbs.length - 1 }">{{ c.title }}</span>
        </template>
      </nav>
      <button v-if="app.refresh" class="icon-btn refresh-btn" :class="{ spin: refreshing }" title="Rafraîchir" @click="onRefresh"><v-icon>mdi-refresh</v-icon></button>
      <span class="sp" />
      <button class="user" @click="go('/profile')"><v-icon size="small">mdi-account</v-icon>{{ auth.userName || 'invité' }}</button>
      <button class="icon-btn" title="Se déconnecter" @click="logout"><v-icon>mdi-logout</v-icon></button>
    </header>

    <main class="main"><router-view /></main>

    <div class="toast" :class="{ show: toastMsg }">{{ toastMsg }}</div>
    <ErrorSnackbar />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { loadAllPlugins, pluginIdFromKey } from '@/plugins/loader.js'
import ErrorSnackbar from '@2026/components/ErrorSnackbar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()

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
onMounted(async () => {
  try { await auth.fetchSession() } catch { /* preview stays usable */ }
  const optional = (auth.appSettings?.plugins || [])
    .map(pluginIdFromKey)
    .filter((id) => id && id !== 'id' && !NO_UI_PLUGINS.has(id))
  if (optional.length) loadAllPlugins(optional)
})

const NAV = [
  { label: 'Accueil', icon: 'mdi-home', route: '/' },
  // `match` makes the item active across a whole section; `children` render
  // a sub-menu while the section is active.
  { label: 'Identité', icon: 'mdi-account-group', match: '/id', children: [
    { label: 'Utilisateurs', route: '/id/user', match: '/id/user' },
    { label: 'Groupes', route: '/id/group', match: '/id/group' },
    { label: 'Entités', route: '/id/company', match: '/id/company' },
    { label: 'Délégués', route: '/id/delegate', match: '/id/delegate' },
    { label: 'Portées', route: '/id/scope', match: '/id/scope' },
  ] },
  { label: 'Projets', icon: 'mdi-folder', route: '/project', match: '/project' },
  { label: 'Administration', icon: 'mdi-cog', match: '/system', children: [
    { label: 'Plugins', route: '/system/plugin', match: '/system/plugin' },
    { label: 'Nœuds', route: '/system/node', match: '/system/node' },
    { label: 'Configuration', route: '/system/configuration', match: '/system/configuration' },
    { label: 'Rôles', route: '/system/role', match: '/system/role' },
    { label: 'Utilisateurs', route: '/system/user', match: '/system/user' },
    { label: 'Cache', route: '/system/cache', match: '/system/cache' },
    { label: 'Bench', route: '/system/bench', match: '/system/bench' },
    { label: 'Information', route: '/system/information', match: '/system/information' },
  ] },
  { label: 'API', icon: 'mdi-api', match: '/api', children: [
    { label: 'Explorateur', route: '/api' },
    { label: 'Jetons', route: '/api/token', match: '/api/token' },
  ] },
]

const collapsed = ref(false)
const isLogin = computed(() => route.name === 'login')
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
  if (route.path.startsWith('/system/role')) return 'Rôles'
  if (route.path.startsWith('/system/user')) return 'Utilisateurs système'
  if (route.path.startsWith('/system/cache')) return 'Cache'
  if (route.path.startsWith('/system/bench')) return 'Bench'
  if (route.path.startsWith('/system/information')) return 'Information'
  if (route.path.startsWith('/system')) return 'Administration'
  if (route.path.startsWith('/api/token')) return 'Jetons d\'API'
  if (route.path.startsWith('/api')) return 'API'
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
  for (const it of NAV) if (it.children && isNavActive(it)) openSections[it.label] = true
}, { immediate: true })

function go(path) { if (route.path !== path) router.push(path) }

// Bar breadcrumb trail: the page-provided crumbs when present, else a single
// crumb from the local title map (Dashboard/Profil don't set breadcrumbs).
const displayCrumbs = computed(() => (app.breadcrumbs.length ? app.breadcrumbs : [{ title: title.value }]))
const refreshing = ref(false)
async function onRefresh() {
  if (!app.refresh || refreshing.value) return
  refreshing.value = true
  try { await app.refresh() } catch { /* page surfaces its own error */ }
  setTimeout(() => { refreshing.value = false }, 600)
}

// Preview logout: clear the backend session then land on the Vibrant login
// (with a ?logout flag so it shows the "logged out" toast). We don't reuse
// the core `auth.logout()` here — it does a top-level nav to Spring's
// /logout, which would leave the SPA; in this standalone preview we want to
// stay in-app. Best-effort against a local (non-OIDC) provider.
async function logout() {
  try { await fetch('logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
  try { await auth.fetchSession() } catch { /* ignore */ }
  router.push({ path: '/login', query: { logout: null } })
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
:root { --v26-font: "Bricolage Grotesque", system-ui, sans-serif; --v26-sys: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; --v26-mono: "JetBrains Mono", ui-monospace, monospace; }
html, body, #app { margin: 0; height: 100%; }
body { font-family: var(--v26-sys); background: rgb(var(--v-theme-background)); }
.v-application, .v-navigation-drawer, .v-app-bar { font-family: var(--v26-sys); }

/* ---- Vibrant re-skin of Vuetify select / autocomplete dropdown menus ----
   These overlays teleport to <body>, outside any view scope, so they're
   styled globally here. Rounded panel, soft shadow, Bricolage font, rounded
   hover/active items — so picking from a list matches the 2026 look. */
.v-select__content,
.v-autocomplete__content,
.v-combobox__content {
  border-radius: 14px !important;
  box-shadow: 0 18px 48px -16px rgba(0, 0, 0, .5) !important;
  border: 1px solid rgba(var(--v-theme-on-surface), .12);
  overflow: hidden;
}
.v-select__content .v-list,
.v-autocomplete__content .v-list,
.v-combobox__content .v-list {
  background: rgb(var(--v-theme-surface)) !important;
  padding: 6px !important;
  font-family: var(--v26-font);
}
.v-select__content .v-list-item,
.v-autocomplete__content .v-list-item,
.v-combobox__content .v-list-item {
  border-radius: 9px !important;
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
.v-autocomplete__content .v-list-item--active .v-list-item__overlay { opacity: 0; }
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
  --w: 264px; --h: 56px;
  min-height: 100vh; color: var(--ink);
  background: rgb(var(--v-theme-background));
}

.sidebar {
  position: fixed; top: 0; left: 0; bottom: 0; width: var(--w); z-index: 30;
  display: flex; flex-direction: column; color: var(--on-primary);
  background: linear-gradient(180deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000));
  transition: transform .22s ease;
}
.nav-collapsed .sidebar { transform: translateX(-100%); }
.brand { display: flex; align-items: center; gap: 12px; padding: 15px 16px; cursor: pointer; }
.brand-logo { width: 32px; height: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.25)); }
.brand-word { font-family: var(--v26-font); font-weight: 800; font-size: 20px; letter-spacing: -.02em; }
.nav { padding: 10px; flex: 1; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-family: var(--v26-font); font-weight: 600; font-size: 14px; color: rgba(255,255,255,.86); margin-bottom: 2px; }
.nav-item:hover { background: rgba(255,255,255,.08); }
.nav-item.active { background: rgba(255,255,255,.16); color: #fff; }
.nav-item .soon { margin-left: auto; font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 20px; background: rgba(255,255,255,.16); }
.nav-item .nav-caret { margin-left: auto; color: rgba(255,255,255,.5); transition: transform .2s, color .15s; }
.nav-item .nav-caret.open { transform: rotate(180deg); color: rgba(255,255,255,.85); }
.nav-item.has-children:hover .nav-caret { color: rgba(255,255,255,.9); }
.nav-item.has-children .soon + .nav-caret { margin-left: 6px; }
.subnav { margin: 2px 0 6px; padding-left: 14px; display: flex; flex-direction: column; gap: 1px; }
.sub-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 9px; cursor: pointer; font-family: var(--v26-font); font-weight: 600; font-size: 13px; color: rgba(255,255,255,.74); }
.sub-item:hover { background: rgba(255,255,255,.07); color: #fff; }
.sub-item.active { background: rgba(255,255,255,.14); color: #fff; }
.sub-item .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .6; flex: none; }
.sub-item .soon { margin-left: auto; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 20px; background: rgba(255,255,255,.14); }
.sb-foot { padding: 10px; }
.ver { font-family: var(--v26-mono); font-size: 11px; opacity: .55; padding: 8px 12px; }

.bar {
  position: fixed; top: 0; left: var(--w); right: 0; height: var(--h); z-index: 20;
  display: flex; align-items: center; gap: 8px; padding: 0 14px;
  background: var(--surface); border-bottom: 1px solid var(--line); box-shadow: 0 1px 3px rgba(0,0,0,.06);
  transition: left .22s ease;
}
.nav-collapsed .bar { left: 0; }
.icon-btn { width: 40px; height: 40px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink); }
.icon-btn:hover { background: var(--hover); }
.crumb { font-family: var(--v26-font); font-weight: 700; font-size: 16px; color: var(--ink); letter-spacing: -.01em; }
.bcrumbs { display: flex; align-items: center; gap: 7px; min-width: 0; overflow: hidden; padding-left: 4px; }
.bc { font-family: var(--v26-font); font-size: 15px; font-weight: 600; color: var(--muted); white-space: nowrap; }
.bc.cur { color: var(--ink); font-weight: 700; letter-spacing: -.01em; }
.bc.link { cursor: pointer; border-radius: 7px; padding: 3px 7px; transition: color .14s, background .14s; }
.bc.link:hover { color: var(--ink); background: var(--hover); }
.bc-sep { color: var(--muted); font-size: 13px; opacity: .55; }
.refresh-btn .v-icon { transition: transform .2s; }
.refresh-btn:hover .v-icon { color: rgb(var(--v-theme-secondary)); }
.refresh-btn.spin .v-icon { animation: bc-spin .6s ease; }
@keyframes bc-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .refresh-btn.spin .v-icon { animation: none; } }
.sp { flex: 1; }
.user { display: flex; align-items: center; gap: 7px; padding: 7px 12px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; color: var(--ink); font-family: var(--v26-font); font-weight: 600; font-size: 14px; }
.user:hover { background: var(--hover); }

.main { margin-left: var(--w); padding: calc(var(--h) + 24px) 28px 64px; transition: margin-left .22s ease; }
.nav-collapsed .main { margin-left: 0; }

.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(16px); background: var(--ink); color: var(--surface); padding: 11px 18px; border-radius: 12px; font-weight: 700; font-size: 14px; z-index: 60; opacity: 0; transition: .25s; pointer-events: none; box-shadow: 0 12px 30px -10px rgba(0,0,0,.5); }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

@media (max-width: 900px) { .sidebar { transform: translateX(-100%); } .bar { left: 0; } .main { margin-left: 0; } }
</style>
