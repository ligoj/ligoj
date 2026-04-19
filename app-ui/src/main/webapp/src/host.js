/*
 * @ligoj/host — shared surface exposed to runtime-loaded plugins.
 *
 * Plugins are built as independent Vite library bundles in their own Maven
 * modules; they mark `@ligoj/host` as external so they don't duplicate the
 * host's stores/composables. At runtime the import map in v-index.html
 * routes `@ligoj/host` to the chunk emitted by this entry — plugins then
 * use the host's own pinia / reactive instances.
 *
 * Keep this surface small and stable: every named export is a public API
 * that external plugins depend on.
 */

export { useApi } from './composables/useApi.js'
export { useDataTable } from './composables/useDataTable.js'
export { useFormGuard } from './composables/useFormGuard.js'
export { useAppStore } from './stores/app.js'
export { useI18nStore } from './stores/i18n.js'
export { useErrorStore } from './stores/error.js'
export { useAuthStore } from './stores/auth.js'
export { default as ImportExportBar } from './components/ImportExportBar.vue'
export { default as LigojDataTable } from './components/LigojDataTable.vue'
export { default as LigojDataTableServer } from './components/LigojDataTableServer.vue'

/**
 * The app's public base path, e.g. `/ligoj/`. Exported so plugins can
 * build absolute URLs that resolve correctly under the host's deployment.
 *
 * Plugin bundles are compiled with their own Vite `base` (defaults to
 * `/`), so inside a plugin `import.meta.env.BASE_URL` is NOT the host's
 * base — using it for `fetch('${BASE}rest/...')` produces `/rest/...`
 * which the host's context-path mapping rejects. Always use this export
 * in plugin code instead.
 */
export const APP_BASE = import.meta.env.BASE_URL
