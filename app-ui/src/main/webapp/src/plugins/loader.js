import registry from './registry.js'
import { loadNlsMessages } from './nls-adapter.js'
import { useI18nStore } from '@/stores/i18n.js'
import router from '@/router/index.js'

const loaded = new Set()
// Tracks in-flight loads so concurrent calls to `loadPlugin(<id>)` share
// the same Promise instead of racing duplicate dynamic imports. The
// wizard's `ensureToolPluginLoaded` and a plugin's declared `requires`
// dependency can both trigger a load for the same id — without dedup
// those would run twice and double-register the bundle.
const inFlight = new Map()

/**
 * Maps a backend plugin key (`service:id:ldap`, `service:prov:aws`,
 * `feature:inbox:sql`, …) to the URL-safe id the loader uses for
 * `/main/<id>/vue/index.js`. The transformation strips the leading
 * `service:` / `feature:` prefix and converts remaining colons to
 * dashes — matching the Maven artifact / webjars layout (e.g.
 * `plugin-id-ldap` ships `/webjars/id-ldap/vue/index.js`). Returns
 * an empty string if the input doesn't look like a plugin key.
 */
export function pluginIdFromKey(key) {
  if (typeof key !== 'string') return ''
  // Already in short form (no `service:`/`feature:` prefix and no colons)?
  // Keep it as-is — used by tests and the REQUIRED_PLUGINS list.
  if (!key.includes(':')) return key
  return key.replace(/^(service|feature):/, '').replace(/:/g, '-')
}

export async function loadPlugin(pluginId) {
  if (loaded.has(pluginId)) return registry.get(pluginId)

  if (registry.has(pluginId)) {
    loaded.add(pluginId)
    return registry.get(pluginId)
  }

  // Validate plugin ID to prevent path traversal
  if (!/^[a-zA-Z0-9][\w-]*$/.test(pluginId)) {
    throw new Error(`Invalid plugin ID: "${pluginId}"`)
  }

  // app-ui exposes plugin webjars through the `/main/*` proxy servlet
  // (Application#pluginProxyServlet), which forwards to the ligoj-api
  // backend on :8081 where plugin JARs actually live. The raw /webjars/*
  // path isn't served here. BASE_URL is `/ligoj/` in both dev and prod.
  const url = `${import.meta.env.BASE_URL}main/${pluginId}/vue/index.js`

  try {
    const module = await import(/* @vite-ignore */ url)
    const definition = module.default
    // Spring's RestRedirectStrategy returns a no-op JS stub (401) for
    // unauthenticated JS requests. As an ES module it parses fine but
    // has no default export — and the namespace itself is frozen, so
    // we can't fall back to `module` and mutate `.id` on it. Treat the
    // missing default as a "not loaded yet, try again after auth"
    // signal: skip silently, don't add to `loaded`, no console spam.
    if (!definition || typeof definition !== 'object') {
      return null
    }

    if (!definition.id) definition.id = pluginId

    registry.register(pluginId, definition)

    if (definition.install) {
      await definition.install({ pluginId, router })
    }

    const i18nStore = useI18nStore()
    try {
      const messages = await loadNlsMessages(pluginId, i18nStore.locale)
      i18nStore.merge(messages)
      i18nStore.markLoaded(pluginId)
    } catch {
      // NLS is optional, plugin works without translations
    }

    loaded.add(pluginId)
    return registry.get(pluginId)
  } catch (err) {
    console.error(`Failed to load plugin "${pluginId}" from ${url}:`, err)
    throw err
  }
}

export async function loadAllPlugins(pluginIds) {
  const results = await Promise.allSettled(pluginIds.map(id => loadPlugin(id)))
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
}
