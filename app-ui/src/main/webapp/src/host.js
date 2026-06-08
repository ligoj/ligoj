/*
 * @ligoj/host — shared surface exposed to runtime-loaded plugins.
 *
 * Plugins are built as independent Vite library bundles in their own Maven
 * modules; they mark `@ligoj/host` as external so they don't duplicate the
 * host's stores/composables. At runtime the import map in index.html
 * routes `@ligoj/host` to the chunk emitted by this entry — plugins then
 * use the host's own pinia / reactive instances.
 *
 * Keep this surface small and stable: every named export is a public API
 * that external plugins depend on.
 */

export { useApi } from './composables/useApi.js'
export { useClipboard } from './composables/useClipboard.js'
export { useDataTable } from './composables/useDataTable.js'
export { useFormGuard } from './composables/useFormGuard.js'
export { useAppStore } from './stores/app.js'
export { useI18nStore } from './stores/i18n.js'
export { useErrorStore } from './stores/error.js'
export { useAuthStore } from './stores/auth.js'
export { default as ImportExportBar } from './components/ImportExportBar.vue'
export { default as LigojDataTable } from './components/LigojDataTable.vue'
export { default as LigojDataTableServer } from './components/LigojDataTableServer.vue'
export { default as LigojConfirmDialog } from './components/LigojConfirmDialog.vue'
export { default as NodeIcon, nodeIcon } from './components/NodeIcon.vue'
export { default as NodeModeChip } from './components/NodeModeChip.vue'
export { default as PluginFeatures } from './components/PluginFeatures.vue'
// 2026 "Vibrant" shared primitives. They live in the host (not a plugin)
// because BOTH plugin-ui and plugin-id consume them and a plugin cannot
// import from a sibling plugin — so the host owns them and re-exports here,
// same as LigojDataTable / LigojConfirmDialog above. VibrantDataTable is the
// presentation-only table (the caller keeps its own useDataTable);
// VibrantConfirmDialog is a drop-in for LigojConfirmDialog (same
// props/slots/events); LigojIcon is the compact-mode-aware <v-icon> wrapper.
export { default as VibrantDataTable } from './components/VibrantDataTable.vue'
export { default as VibrantConfirmDialog } from './components/VibrantConfirmDialog.vue'
export { default as LigojIcon } from './components/LigojIcon.vue'
// 2026 chrome primitives, factored out of the per-view scoped CSS so every
// plugin shares one styled implementation (and one source of truth for the
// design tokens). Pair with the global `.lj-surface` utility class
// (assets/vuetify-overrides.css) on the view root, which supplies the
// --surface/--ink/--radius/... vars these components read.
export { default as LjPageHeader } from './components/LjPageHeader.vue'
export { default as LjButton } from './components/LjButton.vue'
export { default as LjSearch } from './components/LjSearch.vue'
export { default as LjDialog } from './components/LjDialog.vue'
export { default as LjSegmented } from './components/LjSegmented.vue'
export { default as LjAvailabilityField } from './components/LjAvailabilityField.vue'
export { nodeType, isInstance, nodePluginId } from './utils/nodeType.js'
// Registry lookup so a plugin can collaborate with sibling/sub-plugins
// (e.g. `plugin-id` delegating to `plugin-id-ldap` for tool-specific row
// actions). `callFeature` throws if the target plugin isn't registered
// — call sites that want graceful degradation should use
// `pluginRegistry.get(id)?.feature?.(...)` directly.
export { default as pluginRegistry, callFeature } from './plugins/registry.js'
// `loadPlugin` is exposed so a plugin can lazy-pull a sibling at runtime
// (e.g. the subscribe wizard hydrates `id-ldap`'s i18n before rendering
// the parameter labels for an LDAP node). `pluginIdFromKey` converts the
// canonical backend plugin key (`service:id:ldap`) to the URL-safe form
// the loader resolves to a webjar bundle (`id-ldap`).
export { loadPlugin, pluginIdFromKey } from './plugins/loader.js'

// Vuetify primitives re-exported for plugins. A plugin's Vite build keeps
// `@ligoj/host` external; importing VBtn/VIcon from here lets a plugin's
// `renderFeatures()` build VNodes with `h(VBtn, …)` without bundling its
// own copy of Vuetify (which would break shared theming / instance state).
// `VListItem` is what `feature('renderAdmin')` contributors build their
// Administration menu entries with (see AdminNavExtras); `VDivider` is
// exposed for symmetry though the host paints the menu separator itself.
export { VBtn, VChip, VIcon, VTooltip, VListItem, VDivider } from 'vuetify/components'

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
