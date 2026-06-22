import { ref } from 'vue'

const plugins = new Map()

/**
 * Reactive change counter, bumped on every register/remove. Components
 * that derive UI from the *set* of loaded plugins (e.g. `AdminNavExtras`,
 * which polls every plugin for a `renderAdmin` contribution) read
 * `registry.version.value` inside their render function so they re-run
 * when a plugin is lazily loaded after first paint. The registry stays a
 * plain singleton otherwise — only this counter is reactive.
 */
const version = ref(0)

const registry = {
  // Exposed so reactive consumers can track (de)registration. Read
  // `.value` inside a render/computed to subscribe.
  version,

  register(id, definition) {
    const required = ['id', 'install']
    for (const key of required) {
      if (!definition[key]) {
        console.error(`Plugin "${id}" is missing required field: ${key}`)
        return false
      }
    }
    plugins.set(id, {
      id,
      label: definition.label || definition.name || id,
      component: definition.component || null,
      routes: definition.routes || [],
      install: definition.install,
      feature: definition.feature || null,
      service: definition.service || null,
      meta: definition.meta || {},
    })
    version.value++
    return true
  },

  get(id) {
    return plugins.get(id) || null
  },

  has(id) {
    return plugins.has(id)
  },

  list() {
    return Array.from(plugins.values())
  },

  remove(id) {
    const removed = plugins.delete(id)
    if (removed) version.value++
    return removed
  },
}

/**
 * Dispatches a named action to a loaded plugin's `feature` function.
 * Used by the host app and by other plugins to call into a plugin
 * without depending on its service module directly.
 */
export function callFeature(pluginId, action, ...args) {
  const plugin = plugins.get(pluginId)
  if (!plugin) throw new Error(`Plugin "${pluginId}" is not registered`)
  if (typeof plugin.feature !== 'function') {
    throw new Error(`Plugin "${pluginId}" does not expose a feature() function`)
  }
  return plugin.feature(action, ...args)
}

export default registry
