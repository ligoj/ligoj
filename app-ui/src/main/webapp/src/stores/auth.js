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
      { id: 'system-information', label: 'Information', labelKey: 'nav.information', icon: 'mdi-information-outline', route: '/system/information', auth: '^system' },
      { id: 'system-configuration', label: 'Configuration', labelKey: 'nav.configuration', icon: 'mdi-tune', route: '/system/configuration', auth: '^system/configuration' },
      { id: 'system-user', label: 'Users', labelKey: 'nav.systemUsers', icon: 'mdi-account-multiple', route: '/system/user', auth: '^system/user' },
      { id: 'system-role', label: 'Roles', labelKey: 'nav.roles', icon: 'mdi-shield-account', route: '/system/role', auth: '^system/role' },
      { id: 'system-plugin', label: 'Plugins', labelKey: 'nav.plugins', icon: 'mdi-puzzle', route: '/system/plugin', auth: '^system/plugin' },
      { id: 'system-node', label: 'Nodes', labelKey: 'nav.nodes', icon: 'mdi-server', route: '/system/node', auth: '^system/node' },
      { id: 'system-cache', label: 'Cache', labelKey: 'nav.cache', icon: 'mdi-database-refresh', route: '/system/cache', auth: '^system/cache' },
      { id: 'system-bench', label: 'Bench', labelKey: 'nav.bench', icon: 'mdi-speedometer', route: '/system/bench', auth: '^system/bench' },
    ],
  },
]

/**
 * sessionStorage key holding the SPA route the user was on when the session
 * expired, so we can send them back there after re-authenticating. Survives the
 * full-page login redirect (same origin) and the OAuth round-trip.
 */
const RETURN_KEY = 'ligoj-return-url'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!session.value)
  const userName = computed(() => session.value?.userName ?? '')
  const roles = computed(() => session.value?.roles ?? [])
  // The session exposes an explicit `admin` flag; keep the legacy ADMIN-role
  // check as a fallback for older backends that don't emit it.
  const isAdmin = computed(() => session.value?.admin === true || roles.value.includes('ADMIN'))
  const uiAuthorizations = computed(() => session.value?.uiAuthorizations ?? [])
  const apiAuthorizations = computed(() => session.value?.apiAuthorizations ?? [])
  const appSettings = computed(() => session.value?.applicationSettings ?? {})
  /**
   * Free-form per-user blob the backend uses to ship dynamic UI hints
   * (`unreadMessages`, `globalTools`, …). Plugins decorate this in their
   * `ISessionSettingsProvider#decorate`; the SPA reads it through this
   * computed so the source of truth stays in one place.
   */
  const userSettings = computed(() => session.value?.userSettings ?? {})
  /**
   * Backend-driven sidebar "global tools" list — each entry pairs a node
   * id with arbitrary parameters and is rendered by the owning plugin's
   * `feature('renderGlobal', entry)`. The host's `GlobalToolsList`
   * component iterates this and mounts the resulting VNodes above the
   * About menu. Entries reference plugins that may not be loaded yet;
   * the renderer takes care of lazy-loading.
   */
  const globalTools = computed(() => userSettings.value?.globalTools ?? [])

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

  /**
   * HTTP status returned by the latest /rest/session probe. 0 means a
   * network-level failure (no response received). Inspected by callers
   * that need to know *why* the session lookup failed — the redirect to
   * the login page surfaces this through a query-string flag so the
   * login screen can show a meaningful error.
   */
  const lastSessionStatus = ref(null)

  /**
   * Set by `fetchSession` when Spring Security responds with a 3xx
   * (typical OIDC entry point: 302 → `/oauth2/authorization/{client}`).
   * `redirect: 'manual'` turns the response into an `opaqueredirect`
   * which we can't read the Location of, but its presence is enough
   * to trigger a top-level navigation in `redirectToLogin()` so the
   * browser — not fetch — runs the OAuth flow end-to-end.
   */
  const needsOAuthRedirect = ref(false)

  /**
   * Drives the in-page "local" authentication dialog (mounted in
   * `App.vue`). Flipped to true by `useErrorStore.handleResponse` when
   * an API call comes back as 401 with body `{success:false, redirect:
   * "local"}` — the legacy `error.mod.js#showAuthenticationAlert`
   * flow, transplanted to a Vuetify modal so the user can re-
   * authenticate without losing the page state they're in. OIDC mode
   * never lands here: Spring's `redirect` field then carries a Keycloak
   * path which we follow at the window level instead.
   */
  const authPromptOpen = ref(false)

  function openAuthPrompt() {
    authPromptOpen.value = true
  }

  function closeAuthPrompt() {
    authPromptOpen.value = false
  }

  async function fetchSession() {
    loading.value = true
    try {
      // Build the URL against the app's base so relative-path drift
      // (e.g. after a misrouted navigation) can't chain bad segments
      // like `/ligoj/oauth2/authorization/rest/session`.
      const base = import.meta.env.BASE_URL || '/'
      const resp = await fetch(`${base}rest/session`, {
        credentials: 'include',
        // Don't let fetch follow Spring's 302 to OAuth — same-origin
        // 302s would be followed and we'd parse the IdP's HTML as JSON.
        redirect: 'manual',
        headers: { Accept: 'application/json' },
      })
      // Manual redirect mode surfaces 3xx as `opaqueredirect`, status 0.
      // Spring's `RestRedirectStrategy` instead emits a 401 with an
      // `x-redirect` header pointing at the configured login URL
      // (e.g. `/oauth2/authorization/keycloak`) — XHR-friendly by
      // design. Treat both signals identically: kick the browser
      // through the IdP flow.
      // `?.get?.()` so test mocks that omit `headers` don't trip us.
      const xRedirect = resp.headers?.get?.('x-redirect') || ''
      const wantsOAuth = xRedirect.includes('/oauth2/authorization/')
      if (resp.type === 'opaqueredirect' || wantsOAuth) {
        session.value = null
        needsOAuthRedirect.value = true
        lastSessionStatus.value = 302
        return false
      }
      lastSessionStatus.value = resp.status
      if (!resp.ok) {
        session.value = null
        return false
      }
      session.value = await resp.json()
      return true
    } catch {
      session.value = null
      lastSessionStatus.value = 0
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Map the last fetchSession status to a short query-string flag that
   * login.html turns into a localized error message.
   *
   *   0       → 'network'      → "Network error"
   *   401/403 → 'expired'      → "Your session has expired"
   *   503/502 → 'unavailable'  → "Service temporarily unavailable"
   *   other   → 'denied'       → generic "Access denied"
   */
  function loginRedirectReason() {
    const s = lastSessionStatus.value
    if (s === 0) return 'network'
    if (s === 401 || s === 403) return 'expired'
    if (s === 502 || s === 503 || s === 504) return 'unavailable'
    return 'denied'
  }

  /**
   * Send the user back to authentication. With OIDC enabled, Spring
   * Security tells us so via a 302 to its OAuth entry point — we
   * surface that as `needsOAuthRedirect` and top-level-navigate
   * directly to `/oauth2/authorization/keycloak` so the browser runs
   * the full IdP flow (XHR can't, because the IdP is cross-origin).
   * Without OIDC we fall back to the local login page.
   *
   * Always absolute — relative URLs would chain bad path segments if
   * the browser is currently sitting on a misrouted SPA-fallback URL.
   */
  /**
   * Remember the current SPA route (hash path) so the user is sent back to it
   * after logging in again. Skips the home route and login-related paths.
   */
  function rememberReturnRoute() {
    try {
      const path = (typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '') || '/'
      if (path && path !== '/' && !path.startsWith('/login')) {
        sessionStorage.setItem(RETURN_KEY, path)
      }
    } catch { /* sessionStorage unavailable (SSR / private mode) */ }
  }

  /**
   * Read and clear the remembered return route. Returns <code>null</code> when
   * none was stored (fresh login, or in-page re-auth that never left the page).
   */
  function consumeReturnRoute() {
    try {
      const v = sessionStorage.getItem(RETURN_KEY)
      if (v) sessionStorage.removeItem(RETURN_KEY)
      return v || null
    } catch { return null }
  }

  function redirectToLogin() {
    rememberReturnRoute()
    const base = import.meta.env.BASE_URL || '/'
    if (needsOAuthRedirect.value) {
      // The OAuth registration id is the segment Spring exposes via
      // `spring.security.oauth2.client.registration.<id>` (the project
      // uses `keycloak`). Plumb this through a config endpoint if you
      // need multi-IdP support.
      window.location.href = `${base}oauth2/authorization/keycloak`
      return
    }
    const reason = loginRedirectReason()
    window.location.href = `${base}login.html?${reason}`
  }

  /**
   * Top-level navigate to Spring's `/logout` endpoint. We can't use
   * `fetch` here — RP-initiated OIDC logout chains through Spring →
   * Keycloak's `end_session_endpoint` → back, and only a full browser
   * navigation can follow the cross-origin 302s. Spring's
   * `OidcClientInitiatedLogoutSuccessHandler` (wired in
   * `OAuth2BffAuthenticationProvider`) drives the chain when OAuth2Bff
   * is the active provider; for the password-based provider it just
   * invalidates the session and lands on the configured success URL.
   */
  function logout() {
    const base = import.meta.env.BASE_URL || '/'
    session.value = null
    // An explicit logout is not a session expiry — don't bounce back to the
    // previous page after the next login.
    try { sessionStorage.removeItem(RETURN_KEY) } catch { /* ignore */ }
    window.location.href = `${base}logout`
  }

  return {
    session, loading,
    isAuthenticated, userName, roles, isAdmin,
    uiAuthorizations, apiAuthorizations, appSettings, userSettings, globalTools,
    navItems,
    isAllowed, isAllowedApi,
    fetchSession, logout, redirectToLogin, lastSessionStatus, needsOAuthRedirect,
    consumeReturnRoute,
    authPromptOpen, openAuthPrompt, closeAuthPrompt,
  }
})
