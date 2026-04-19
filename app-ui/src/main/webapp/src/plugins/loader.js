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

  const url = `/webjars/${pluginId}/vue/index.js`

  try {
    const module = await import(/* @vite-ignore */ url)
    const definition = module.default || module

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
