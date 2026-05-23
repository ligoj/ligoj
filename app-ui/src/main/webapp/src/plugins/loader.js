import registry from './registry.js'
import { loadNlsMessages } from './nls-adapter.js'
import { useI18nStore } from '@/stores/i18n.js'
import router from '@/router/index.js'

const loaded = new Set()

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
