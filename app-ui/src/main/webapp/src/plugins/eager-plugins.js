/*
 * Which of the core plugins to load before the router mounts.
 *
 * `REQUIRED_PLUGINS` are the plugins whose routes must exist at mount time
 * (`id`, `ui`, `prov`). A deployment does not necessarily install all of them:
 * the backend lists the installed bundle-shipping plugins in the session
 * (`applicationSettings.data['ui-plugins']`, comma-joined keys such as
 * `service:prov`), so the boot only requests the bundles that exist instead
 * of hitting a 404 on `/main/prov/vue/index.js` for every session.
 */
import { pluginIdFromKey } from './plugin-key.js'

export const REQUIRED_PLUGINS = ['id', 'ui', 'prov']

/**
 * The core plugins to load eagerly.
 *
 * @param {string|null|undefined} uiPluginsData The `ui-plugins` session value (comma-joined plugin keys), null/undefined
 *   when the backend predates it: every required plugin is then attempted, as before.
 * @param {string[]} required The core plugin ids, `REQUIRED_PLUGINS` by default.
 * @returns {string[]} The ids to load now, in the required order.
 */
export function eagerPlugins(uiPluginsData, required = REQUIRED_PLUGINS) {
  if (uiPluginsData == null) return [...required]
  const installed = new Set(String(uiPluginsData).split(',').map((k) => pluginIdFromKey(k.trim())).filter(Boolean))
  return required.filter((id) => installed.has(id))
}

/**
 * Whether a plugin can serve a UI bundle, according to the session's `ui-plugins` data (comma-joined backend keys
 * of the installed plugins shipping a bundle). Without that data (older backend, no session yet) the answer is
 * unknown and counts as installed, so the loader behaves as before.
 *
 * @param {string} pluginId The loader id (`prov`, `id-ldap`, ...).
 * @param {string|null|undefined} uiPluginsData The session `ui-plugins` value.
 * @returns {boolean} `false` only when the plugin is known not to ship a bundle.
 */
export function isPluginInstalled(pluginId, uiPluginsData) {
  if (uiPluginsData == null) return true
  return String(uiPluginsData).split(',').map((k) => pluginIdFromKey(k.trim())).includes(pluginId)
}
