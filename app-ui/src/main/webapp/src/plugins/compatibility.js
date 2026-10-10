/*
 * Compatibility of a runtime plugin bundle with this host. A plugin bundle imports named exports of the modules
 * shared through the import map (`@ligoj/host`, `vue`, `vue-router`, `pinia`, `vuetify`): when the running host lacks
 * one of them, the browser refuses to link the whole bundle and the plugin disappears. The loader reads the bundle
 * first, lists these imports and compares them with the exports of this host, so an incompatible plugin is skipped
 * with its reason instead of failing at import time.
 */
import { reactive } from 'vue'

/** The import map specifiers a plugin bundle shares with the host. */
export const SHARED_SPECIFIERS = ['@ligoj/host', 'vue', 'vue-router', 'pinia', 'vuetify']

// One statement of the import header, after blanks and comments: `import|export <clause> from "<specifier>"`, or a
// side-effect `import "<specifier>"`. The clause holds only identifiers, braces, commas and `*`.
const HEADER_STATEMENT = /(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*)*(?:(import|export)\b([\w$\s,{}*]*?)\bfrom\s*(["'])([^"'\n]+)\3|import\s*(["'])[^"'\n]+\5)\s*;?/y

/**
 * The `import|export … from` statements of the import header: the bundler hoists every static import to the top of
 * the bundle, so the scan stops at the first other statement and never reads a code sample of the body.
 */
function headerStatements(source) {
  const statements = []
  HEADER_STATEMENT.lastIndex = 0
  let match
  while ((match = HEADER_STATEMENT.exec(source))) {
    if (match[1]) statements.push(match)
  }
  return statements
}

/**
 * The names a bundle imports from the shared modules.
 *
 * @param {string} source The bundle source.
 * @returns {Object<string, string[]>} The imported names by shared specifier, sorted, without duplicates. `default`
 *   stands for a default import; a namespace import (`* as x`) requires no name.
 */
export function sharedImports(source) {
  const result = {}
  for (const [, keyword, clause, , specifier] of headerStatements(String(source ?? ''))) {
    if (!SHARED_SPECIFIERS.includes(specifier)) continue
    const names = result[specifier] ?? new Set()
    const braces = /\{([^}]*)\}/.exec(clause)
    for (const item of braces ? braces[1].split(',') : []) {
      const name = item.trim().split(/\s+as\s+/)[0].trim()
      if (name) names.add(name)
    }
    // A default import: an identifier alone or before the braces, `import x from` or `import x, { y } from`
    const head = (braces ? clause.slice(0, braces.index) : clause).trim().replace(/,$/, '').trim()
    if (keyword === 'import' && head && !head.startsWith('*')) names.add('default')
    result[specifier] = names
  }
  return Object.fromEntries(Object.entries(result).map(([specifier, names]) => [specifier, [...names].sort()]))
}

/**
 * The names a bundle imports that this host does not export.
 *
 * @param {Object<string, string[]>} required The imports of the bundle, see sharedImports.
 * @param {Object<string, string[]>} available The exports of this host by shared specifier. A specifier without
 *   known exports is not checked.
 * @returns {Object<string, string[]>} The missing names by specifier, only for the specifiers missing names.
 */
export function missingExports(required, available) {
  const missing = {}
  for (const [specifier, names] of Object.entries(required || {})) {
    const known = available?.[specifier]
    if (!known) continue
    const exported = new Set(known)
    const absent = names.filter((name) => !exported.has(name))
    if (absent.length) missing[specifier] = absent
  }
  return missing
}

// Exports of this host by shared specifier, registered at boot (main.js): none in unit tests
const hostExports = {}
// The plugins found incompatible, by loader id: `{ missing }`. Reactive for the plug-in view and the warning chip.
const incompatibles = reactive({})

/**
 * Register the exports of the modules this host shares through the import map. Called once at boot, before any
 * plugin load; until then no bundle is checked.
 *
 * @param {Object<string, object>} modules The module namespaces by import map specifier.
 */
export function registerHostModules(modules) {
  for (const [specifier, namespace] of Object.entries(modules || {})) {
    // The library facades of the import map also export a default (see vite.config.js, sharedShimSource)
    hostExports[specifier] = [...Object.keys(namespace), ...(specifier === '@ligoj/host' ? [] : ['default'])]
  }
}

/**
 * Text of missing names: the host ones alone, the others prefixed by their module.
 *
 * @param {Object<string, string[]>} missing The missing names by specifier.
 * @returns {string} For instance `remoteSearchField, vue: useModel`.
 */
export function describeMissing(missing) {
  return Object.entries(missing || {})
    .flatMap(([specifier, names]) => names.map((name) => (specifier === '@ligoj/host' ? name : `${specifier}: ${name}`)))
    .join(', ')
}

/** A plugin bundle needing exports this host lacks: never imported. */
export class IncompatiblePluginError extends Error {
  constructor(pluginId, missing) {
    super(`Plugin "${pluginId}" needs exports missing from this host: ${describeMissing(missing)}`)
    this.name = 'IncompatiblePluginError'
    this.pluginId = pluginId
    this.missing = missing
  }
}

/**
 * @param {string} pluginId The loader id, such as `qa-sonarqube`.
 * @returns {{missing: Object<string, string[]>}|null} The incompatibility of this plugin, null when none is known.
 */
export function pluginIncompatibility(pluginId) {
  return incompatibles[pluginId] ?? null
}

/** @returns {Array<{id: string, missing: Object<string, string[]>}>} The incompatible plugins, sorted by id. */
export function pluginIncompatibilities() {
  return Object.keys(incompatibles).sort().map((id) => ({ id, ...incompatibles[id] }))
}

/**
 * Read a plugin bundle and compare its shared imports with the exports of this host. A bundle that cannot be read
 * (network error, 404, the JavaScript stub served to an expired session) passes: its import then fails as before.
 *
 * @param {string} pluginId The loader id.
 * @param {string} url The bundle URL, the same one the loader imports so the browser cache serves it once.
 * @returns {Promise<Object<string, string[]>>} The missing names, empty when compatible or unknown. Recorded when not
 *   empty, see pluginIncompatibility.
 */
export async function checkBundle(pluginId, url) {
  if (!Object.keys(hostExports).length) return {}
  let source
  try {
    const response = await fetch(url)
    if (!response.ok) return {}
    source = await response.text()
  } catch {
    return {}
  }
  const missing = missingExports(sharedImports(source), hostExports)
  if (Object.keys(missing).length) incompatibles[pluginId] = { missing }
  return missing
}

/**
 * The administrator warning of the app-bar chips (SessionWarningChips): the incompatible plugins, if any. A click
 * opens the plug-in view.
 *
 * @returns {Array<{code: string, parameters: {plugins: string}, link: string}>} One coded warning, or none.
 */
export function incompatibilityWarnings() {
  const ids = Object.keys(incompatibles).sort()
  return ids.length ? [{ code: 'plugin-incompatible', parameters: { plugins: ids.join(', ') }, link: '/system/plugin' }] : []
}

/** Tests only: forget the registered exports and the incompatible plugins. */
export function _resetCompatibility() {
  for (const key of Object.keys(hostExports)) delete hostExports[key]
  for (const key of Object.keys(incompatibles)) delete incompatibles[key]
}
