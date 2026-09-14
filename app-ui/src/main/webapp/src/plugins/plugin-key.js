/**
 * Maps a backend plugin key (`service:id:ldap`, `service:prov:aws`,
 * `feature:inbox:sql`, …) to the URL-safe id the loader uses for
 * `/main/<id>/vue/index.js`. The transformation strips the leading
 * `service:` / `feature:` prefix and converts remaining colons to
 * dashes — matching the Maven artifact / webjars layout (e.g.
 * `plugin-id-ldap` ships `/webjars/id-ldap/vue/index.js`). Returns
 * an empty string if the input doesn't look like a plugin key.
 */
export function pluginIdFromKey(key) {
  if (typeof key !== 'string') return ''
  // Already in short form (no `service:`/`feature:` prefix and no colons)?
  // Keep it as-is — used by tests and the REQUIRED_PLUGINS list.
  if (!key.includes(':')) return key
  return key.replace(/^(service|feature):/, '').replace(/:/g, '-')
}
