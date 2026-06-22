import registry from './registry.js'
import inboxSqlDef from './inbox-sql/index.js'

export function registerBuiltinPlugins() {
  const plugins = [inboxSqlDef]
  for (const def of plugins) {
    registry.register(def.id, def)
  }
}
