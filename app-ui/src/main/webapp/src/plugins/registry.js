const plugins = new Map()

const registry = {
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
    return plugins.delete(id)
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
