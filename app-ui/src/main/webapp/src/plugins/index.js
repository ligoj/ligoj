import registry from './registry.js'
import inboxSqlDef from './inbox-sql/index.js'
import provDef from './prov/index.js'

export function registerBuiltinPlugins() {
  const plugins = [inboxSqlDef, provDef]
  for (const def of plugins) {
    registry.register(def.id, def)
  }
}
