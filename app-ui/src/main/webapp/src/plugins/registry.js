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

export default registry
