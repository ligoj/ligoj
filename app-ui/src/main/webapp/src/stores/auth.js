import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Static navigation config. Each item's `auth` is tested against uiAuthorizations.
 */
const NAV_CONFIG = [
  {
    id: 'home', label: 'Home', labelKey: 'nav.home', icon: 'mdi-home', route: '/',
    auth: '^(home|$)',
  },
  {
    id: 'id', label: 'Identity', labelKey: 'nav.identity', icon: 'mdi-account-group', route: '/id',
    auth: '^id',
    children: [
      { id: 'id-user', label: 'Users', labelKey: 'nav.users', icon: 'mdi-account-multiple', route: '/id/user', auth: '^id/user' },
      { id: 'id-group', label: 'Groups', labelKey: 'nav.groups', icon: 'mdi-account-group-outline', route: '/id/group', auth: '^id/container/group' },
      { id: 'id-company', label: 'Companies', labelKey: 'nav.companies', icon: 'mdi-domain', route: '/id/company', auth: '^id/container/company' },
      { id: 'id-delegate', label: 'Delegates', labelKey: 'nav.delegates', icon: 'mdi-account-switch', route: '/id/delegate', auth: '^id/delegate' },
      { id: 'id-container-scope', label: 'Container Scopes', labelKey: 'nav.containerScopes', icon: 'mdi-shape', route: '/id/container-scope', auth: '^id/container-scope' },
    ],
  },
  {
    id: 'project', label: 'Projects', labelKey: 'nav.projects', icon: 'mdi-folder-multiple', route: '/home/project',
    auth: '^home',
  },
  {
    id: 'system', label: 'System', labelKey: 'nav.system', icon: 'mdi-cog', route: '/system',
    auth: '^system',
    children: [
      { id: 'system-information',   label: 'Information',   labelKey: 'nav.information',   icon: 'mdi-information-outline', route: '/system/information',   auth: '^system' },
      { id: 'system-configuration', label: 'Configuration', labelKey: 'nav.configuration', icon: 'mdi-tune',                route: '/system/configuration', auth: '^system/configuration' },
      { id: 'system-user',          label: 'Users',         labelKey: 'nav.users',         icon: 'mdi-account-multiple',    route: '/system/user',          auth: '^system/user' },
      { id: 'system-role',          label: 'Roles',         labelKey: 'nav.roles',         icon: 'mdi-shield-account',      route: '/system/role',          auth: '^system/role' },
      { id: 'system-plugin',        label: 'Plugins',       labelKey: 'nav.plugins',       icon: 'mdi-puzzle',              route: '/system/plugin',        auth: '^system/plugin' },
      { id: 'system-node',          label: 'Nodes',         labelKey: 'nav.nodes',         icon: 'mdi-server',              route: '/system/node',          auth: '^system/node' },
      { id: 'system-cache',         label: 'Cache',         labelKey: 'nav.cache',         icon: 'mdi-database-refresh',    route: '/system/cache',         auth: '^system/cache' },
      { id: 'system-bench',         label: 'Bench',         labelKey: 'nav.bench',         icon: 'mdi-speedometer',         route: '/system/bench',         auth: '^system/bench' },
    ],
  },
]

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!session.value)
  const userName = computed(() => session.value?.userName ?? '')
  const roles = computed(() => session.value?.roles ?? [])
  const isAdmin = computed(() => roles.value.includes('ADMIN'))
  const uiAuthorizations = computed(() => session.value?.uiAuthorizations ?? [])
  const apiAuthorizations = computed(() => session.value?.apiAuthorizations ?? [])
  const appSettings = computed(() => session.value?.applicationSettings ?? {})

  function isAllowed(url) {
    if (isAdmin.value) return true
    return uiAuthorizations.value.some(pattern => {
      try { return new RegExp(pattern).test(url) } catch { return false }
    })
  }

  function isAllowedApi(url, method = 'GET') {
    if (isAdmin.value) return true
    return apiAuthorizations.value.some(auth => {
      const pattern = typeof auth === 'string' ? auth : auth.pattern
      const m = typeof auth === 'string' ? null : auth.method
      if (m && m !== method) return false
      try { return new RegExp(pattern).test(url) } catch { return false }
    })
  }

  /** Build navigation items filtered by user's uiAuthorizations */
  const navItems = computed(() => {
    return NAV_CONFIG.filter(item => isAllowed(item.auth.replace('^', '').replace(/[$()|]/g, '')))
      .map(item => {
        if (!item.children) return item
        const children = item.children.filter(child =>
          isAllowed(child.auth.replace('^', '').replace(/[$()|]/g, ''))
        )
        return children.length ? { ...item, children } : null
      })
      .filter(Boolean)
  })

  async function fetchSession() {
    loading.value = true
    try {
      const resp = await fetch('rest/session', { credentials: 'include' })
      if (!resp.ok) {
        session.value = null
        return false
      }
      session.value = await resp.json()
      return true
    } catch {
      session.value = null
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await fetch('rest/security/logout', { method: 'POST', credentials: 'include' })
    session.value = null
  }

  return {
    session, loading,
    isAuthenticated, userName, roles, isAdmin,
    uiAuthorizations, apiAuthorizations, appSettings,
    navItems,
    isAllowed, isAllowedApi,
    fetchSession, logout,
  }
})
