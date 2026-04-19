import { describe, it, expect } from 'vitest'
import scmGitDef from '@/plugins/scm-git/index.js'
import kmConfluenceDef from '@/plugins/km-confluence/index.js'
import buildJenkinsDef from '@/plugins/build-jenkins/index.js'
import btDef from '@/plugins/bt/index.js'
import btJiraDef from '@/plugins/bt-jira/index.js'
import vmDef from '@/plugins/vm/index.js'
import inboxSqlDef from '@/plugins/inbox-sql/index.js'
import provDef from '@/plugins/prov/index.js'
import { registerBuiltinPlugins } from '@/plugins/index.js'
import registry from '@/plugins/registry.js'

const EXPECTED_IDS = [
  'service:scm:git',
  'service:km:confluence',
  'service:build:jenkins',
  'service:bt',
  'service:bt:jira',
  'service:vm',
  'feature:inbox:sql',
  'service:prov',
]

describe('Plugin Contracts', () => {
  const plugins = [
    { name: 'scm-git', def: scmGitDef },
    { name: 'km-confluence', def: kmConfluenceDef },
    { name: 'build-jenkins', def: buildJenkinsDef },
    { name: 'bt', def: btDef },
    { name: 'bt-jira', def: btJiraDef },
    { name: 'vm', def: vmDef },
    { name: 'inbox-sql', def: inboxSqlDef },
    { name: 'prov', def: provDef },
  ]

  describe.each(plugins)('$name plugin', ({ def }) => {
    it('has id as string matching service: or feature: prefix', () => {
      expect(typeof def.id).toBe('string')
      expect(def.id).toMatch(/^(service|feature):/)
    })

    it('has non-empty label string', () => {
      expect(typeof def.label).toBe('string')
      expect(def.label.length).toBeGreaterThan(0)
    })

    it('has install function', () => {
      expect(typeof def.install).toBe('function')
    })

    it('has meta with icon and color', () => {
      expect(def.meta).toBeDefined()
      expect(typeof def.meta.icon).toBe('string')
      expect(def.meta.icon.length).toBeGreaterThan(0)
      expect(typeof def.meta.color).toBe('string')
      expect(def.meta.color.length).toBeGreaterThan(0)
    })
  })
})

describe('registerBuiltinPlugins', () => {
  it('registers all 8 builtin plugins', () => {
    registerBuiltinPlugins()

    const registered = registry.list()
    expect(registered.length).toBeGreaterThanOrEqual(8)
  })

  it('registers plugins with correct IDs', () => {
    registerBuiltinPlugins()

    for (const id of EXPECTED_IDS) {
      expect(registry.has(id)).toBe(true)
    }
  })
})
