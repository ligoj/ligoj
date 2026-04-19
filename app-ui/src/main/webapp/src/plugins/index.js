import registry from './registry.js'
import scmGitDef from './scm-git/index.js'
import kmConfluenceDef from './km-confluence/index.js'
import buildJenkinsDef from './build-jenkins/index.js'
import btDef from './bt/index.js'
import btJiraDef from './bt-jira/index.js'
import vmDef from './vm/index.js'
import inboxSqlDef from './inbox-sql/index.js'
import provDef from './prov/index.js'

export function registerBuiltinPlugins() {
  const plugins = [scmGitDef, kmConfluenceDef, buildJenkinsDef, btDef, btJiraDef, vmDef, inboxSqlDef, provDef]
  for (const def of plugins) {
    registry.register(def.id, def)
  }
}
