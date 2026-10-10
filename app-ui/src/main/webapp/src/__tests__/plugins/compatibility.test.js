/*
 * Compatibility of a runtime plugin bundle with this host: the names a bundle imports from the import map modules,
 * compared with the exports of this host.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sharedImports, missingExports, registerHostModules, checkBundle, pluginIncompatibility, pluginIncompatibilities, describeMissing, IncompatiblePluginError, incompatibilityWarnings, _resetCompatibility } from '@/plugins/compatibility.js'
import en from '@/i18n/en.js'
import fr from '@/i18n/fr.js'
import * as host from '@/host.js'

describe('sharedImports — the shared names a plugin bundle imports', () => {
  it('reads the named imports of the Rolldown output, aliases dropped', () => {
    const bundle = 'import { VIcon as e, remoteSearchField as t, useI18nStore as i } from "@ligoj/host";\nimport { h as a } from "vue";\nvar o = 1;\n'
    expect(sharedImports(bundle)).toEqual({ '@ligoj/host': ['VIcon', 'remoteSearchField', 'useI18nStore'], vue: ['h'] })
  })

  it('reads minified and multi-line statements, and re-exports', () => {
    expect(sharedImports('import{a as b,c}from"@ligoj/host";export{d as e}from\'vuetify\';')).toEqual({ '@ligoj/host': ['a', 'c'], vuetify: ['d'] })
    expect(sharedImports('import {\n\tuseApi as e,\n\tLjButton as t\n} from "@ligoj/host";')).toEqual({ '@ligoj/host': ['LjButton', 'useApi'] })
  })

  it('counts a default import, not a namespace import', () => {
    expect(sharedImports('import Vue, { ref as r } from "vue";\nimport * as host from "@ligoj/host";')).toEqual({ vue: ['default', 'ref'], '@ligoj/host': [] })
  })

  it('ignores the other modules and the look-alike texts', () => {
    const bundle = 'import { x } from "./local.js";\nimport { y } from "/ligoj/main/id/vue/index.js";\nconst s = "import { z } from";\nconst o = { from: "vue" };\nexport default { importance: 1 };\n'
    expect(sharedImports(bundle)).toEqual({})
    expect(sharedImports('')).toEqual({})
    expect(sharedImports(undefined)).toEqual({})
  })

  it('reads only the import header of the bundle, never a code sample in its body', () => {
    const header = '/*! banner */\nimport "./index.css";\n// shared\nimport { a as b } from "vue";\n'
    for (const body of ['const s = `\nimport { nope } from "vue"\n`;', 'const s = "a;import {nope} from \'vue\'";', '/*\nimport {nope} from "vue"\n*/']) {
      expect(sharedImports(`${header}var o = 1;\n${body}\n`)).toEqual({ vue: ['a'] })
    }
  })
})

describe('missingExports — what this host lacks', () => {
  it('lists, by module, the imported names this host does not export', () => {
    const required = { '@ligoj/host': ['remoteSearchField', 'useApi'], vue: ['h'] }
    expect(missingExports(required, { '@ligoj/host': ['useApi'], vue: ['h', 'ref'] })).toEqual({ '@ligoj/host': ['remoteSearchField'] })
    expect(missingExports(required, { '@ligoj/host': ['remoteSearchField', 'useApi'], vue: ['h'] })).toEqual({})
  })

  it('does not check a module whose exports are unknown', () => {
    expect(missingExports({ pinia: ['defineStore'] }, { '@ligoj/host': [] })).toEqual({})
    expect(missingExports({ '@ligoj/host': ['x'] }, {})).toEqual({})
  })
})

describe('checkBundle — the compatibility of a plugin bundle', () => {
  beforeEach(() => { _resetCompatibility() })
  const respond = (body, ok = true) => vi.fn(async () => ({ ok, status: ok ? 200 : 404, text: async () => body }))

  it('records the names this host lacks', async () => {
    registerHostModules({ '@ligoj/host': { useApi: 1 }, vue: { h: 1 } })
    globalThis.fetch = respond('import { useApi as a, remoteSearchField as b } from "@ligoj/host";\nimport Vue from "vue";')
    expect(await checkBundle('qa-sonarqube', '/ligoj/main/qa-sonarqube/vue/index.js')).toEqual({ '@ligoj/host': ['remoteSearchField'] })
    expect(fetch).toHaveBeenCalledWith('/ligoj/main/qa-sonarqube/vue/index.js')
    expect(pluginIncompatibility('qa-sonarqube')).toEqual({ missing: { '@ligoj/host': ['remoteSearchField'] } })
    expect(pluginIncompatibilities()).toEqual([{ id: 'qa-sonarqube', missing: { '@ligoj/host': ['remoteSearchField'] } }])
  })

  it('passes a compatible bundle, and the default of a library facade', async () => {
    registerHostModules({ '@ligoj/host': { useApi: 1 }, vue: { h: 1 } })
    globalThis.fetch = respond('import Vue, { h as a } from "vue";\nimport { useApi as b } from "@ligoj/host";')
    expect(await checkBundle('compatible', 'u')).toEqual({})
    expect(pluginIncompatibility('compatible')).toBeNull()
  })

  it('passes a bundle it cannot read: missing, unreachable or the stub of an expired session', async () => {
    registerHostModules({ '@ligoj/host': { useApi: 1 } })
    globalThis.fetch = respond('', false)
    expect(await checkBundle('missing', 'u')).toEqual({})
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    expect(await checkBundle('unreachable', 'u')).toEqual({})
    globalThis.fetch = respond('export default {}')
    expect(await checkBundle('stub', 'u')).toEqual({})
    expect(pluginIncompatibilities()).toEqual([])
  })

  it('checks nothing before the host exports are registered', async () => {
    globalThis.fetch = respond('import { remoteSearchField as b } from "@ligoj/host";')
    expect(await checkBundle('early', 'u')).toEqual({})
    expect(fetch).not.toHaveBeenCalled()
  })

  it('describes the missing names, the host ones without their module', () => {
    const missing = { '@ligoj/host': ['remoteSearchField'], vue: ['useModel'] }
    expect(describeMissing(missing)).toBe('remoteSearchField, vue: useModel')
    const error = new IncompatiblePluginError('qa-sonarqube', missing)
    expect(error.name).toBe('IncompatiblePluginError')
    expect(error.pluginId).toBe('qa-sonarqube')
    expect(error.missing).toBe(missing)
    expect(error.message).toBe('Plugin "qa-sonarqube" needs exports missing from this host: remoteSearchField, vue: useModel')
  })
})

describe('incompatibilityWarnings — the administrator chip of the app bar', () => {
  beforeEach(() => { _resetCompatibility() })

  it('is one coded warning naming the incompatible plugins, none when all are compatible', async () => {
    expect(incompatibilityWarnings()).toEqual([])
    registerHostModules({ '@ligoj/host': {} })
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => 'import { x as a } from "@ligoj/host";' }))
    await checkBundle('vm-aws', 'u')
    await checkBundle('qa-sonarqube', 'u')
    expect(incompatibilityWarnings()).toEqual([{ code: 'plugin-incompatible', parameters: { plugins: 'qa-sonarqube, vm-aws' } }])
  })

  it('is localized in English and French', () => {
    for (const bundle of [en, fr]) {
      expect(bundle['warning.plugin-incompatible.label']).toBeTruthy()
      expect(bundle['warning.plugin-incompatible']).toContain('{plugins}')
    }
    // A newer host may also have removed an export: the warning does not assume which side is outdated
    expect(en['warning.plugin-incompatible']).not.toMatch(/newer/i)
    expect(fr['warning.plugin-incompatible']).not.toMatch(/plus récente/i)
  })

  it('the host exposes the incompatibilities to the plugins', () => {
    expect(host.pluginIncompatibility).toBe(pluginIncompatibility)
    expect(host.pluginIncompatibilities).toBe(pluginIncompatibilities)
    expect(host.describeMissing).toBe(describeMissing)
  })
})
