import registry from './registry.js'
import router from '@/router/index.js'
import { pluginAssetVersion } from './asset-version.js'
import { pluginIdFromKey } from './plugin-key.js'

const loaded = new Set()
// Tracks in-flight loads so concurrent calls to `loadPlugin(<id>)` share
// the same Promise instead of racing duplicate dynamic imports. The
// wizard's `ensureToolPluginLoaded` and a plugin's declared `requires`
// dependency can both trigger a load for the same id — without dedup
// those would run twice and double-register the bundle.
const inFlight = new Map()

// `pluginIdFromKey` lives in a dependency-free module (shared with the boot
// sequence, which runs before the router exists); re-exported for callers.
export { pluginIdFromKey }

export function loadPlugin(pluginId) {
  if (loaded.has(pluginId)) return Promise.resolve(registry.get(pluginId))

  if (registry.has(pluginId)) {
    loaded.add(pluginId)
    return Promise.resolve(registry.get(pluginId))
  }

  const existing = inFlight.get(pluginId)
  if (existing) return existing

  const p = _loadPlugin(pluginId).finally(() => inFlight.delete(pluginId))
  inFlight.set(pluginId, p)
  return p
}

async function _loadPlugin(pluginId) {
  // Validate plugin ID to prevent path traversal
  if (!/^[a-zA-Z0-9][\w-]*$/.test(pluginId)) {
    throw new Error(`Invalid plugin ID: "${pluginId}"`)
  }

  // app-ui exposes plugin webjars through the `/main/*` proxy servlet
  // (Application#pluginProxyServlet), which forwards to the ligoj-api
  // backend on :8081 where plugin JARs actually live. The raw /webjars/*
  // path isn't served here. BASE_URL is `/ligoj/` in both dev and prod.
  //
  // `?v=<digest|timestamp>` versions the stable URL so the server can
  // long-cache the bundle (Application#pluginCacheFilter) while plugin
  // upgrades rotate the digest — see plugins/asset-version.js.
  const v = pluginAssetVersion()
  const url = `${import.meta.env.BASE_URL}main/${pluginId}/vue/index.js${v ? `?v=${v}` : ''}`

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

    // Resolve declared dependencies before registering or installing this
    // plugin: parents must own their slot in the registry and have merged
    // their i18n bundle before a sub-plugin runs install() — e.g.
    // `plugin-id-ldap` (tool-level) requires `plugin-id` (service-level)
    // so the wizard can resolve inherited parameter labels like
    // `service:id:ou` regardless of which plugin set is preloaded.
    const requires = Array.isArray(definition.requires) ? definition.requires : []
    if (requires.length) {
      await Promise.all(requires.map((depId) => loadPlugin(depId)))
    }

    registry.register(pluginId, definition)

    if (definition.install) {
      await definition.install({ pluginId, router })
    }

    loaded.add(pluginId)
    return registry.get(pluginId)
  } catch (err) {
    if (isMissingBundleError(err)) {
      console.debug(`[plugin loader] no Vue bundle for "${pluginId}" — un-migrated, skipping`)
    } else {
      console.error(`Failed to load plugin "${pluginId}" from ${url}:`, err)
    }
    throw err
  }
}

/**
 * Distinguishes "no `vue/index.js` at the target URL" from a genuine
 * runtime error inside an existing bundle. Chrome/Firefox both throw a
 * `TypeError` with this exact message from `import()` on 404; Safari
 * uses `Importing a module script failed.` — match either substring.
 */
function isMissingBundleError(err) {
  if (!err) return false
  const msg = String(err.message || err)
  return msg.includes('Failed to fetch dynamically imported module')
    || msg.includes('Importing a module script failed')
}

export async function loadAllPlugins(pluginIds) {
  const results = await Promise.allSettled(pluginIds.map(id => loadPlugin(id)))
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
}
