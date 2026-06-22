/**
 * Classify a Ligoj node by its identifier.
 *
 * Node ids follow `<service|feature>:<service>[:<tool>[:<instance>]]`:
 *   - 4+ parts → 'instance'   (e.g. service:scm:git:gitlab-1)
 *   - 3 parts  → 'tool'       (e.g. service:scm:git)
 *   - 2 parts  → 'service' or 'feature' depending on the first segment
 *   - fewer    → 'service' or 'feature' (root marker)
 *
 * Accepts either a node object (uses `.id`) or a raw string id.
 */
export function nodeType(node) {
  const id = typeof node === 'string' ? node : (node?.id || '')
  const parts = id.split(':').filter(Boolean)
  if (parts.length >= 4) return 'instance'
  if (parts.length === 3) return 'tool'
  return parts[0] === 'feature' ? 'feature' : 'service'
}

/** Convenience predicate — true when the node is an instance-level node. */
export function isInstance(node) {
  return nodeType(node) === 'instance'
}

/**
 * Returns the plugin id that owns a node, or `null` if it can't be derived.
 * The plugin id is the second segment of the node id:
 *   service:id            → 'id'
 *   service:id:ldap       → 'id'
 *   service:prov:aws:foo  → 'prov'
 *   feature:foo           → 'foo'
 */
export function nodePluginId(node) {
  const id = typeof node === 'string' ? node : (node?.id || '')
  const parts = id.split(':').filter(Boolean)
  return parts[1] || null
}
