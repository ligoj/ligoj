/*
 * delegate — parent→tool plugin delegation helpers.
 *
 * Every service-level parent plugin (bt, build, km, scm, qa, security,
 * storage, vm, id, mail) resolved its tool sub-plugin and forwarded the
 * subscription-row hooks to it with the SAME ~40-line block, differing
 * only in a log label. These helpers centralise that so a parent is:
 *
 *   import { toolPluginId, delegateFeature } from '@ligoj/host'
 *   export const subPluginIdFor = toolPluginId
 *   export const delegateToToolPlugin = (sub, action) => delegateFeature(sub, action, 'build')
 *
 * Re-exported from `@ligoj/host`.
 */
import registry from './registry.js'

/**
 * Derive the tool sub-plugin id from a subscription's node id. A node id
 * is `service:<service>:<tool>[:<instance>]`; segments 2 and 3 give the
 * sub-plugin — `service:bt:jira:1` → `bt-jira`, `service:vm:aws:i-1` →
 * `vm-aws`. Returns null when there is no tool segment to delegate to.
 */
export function toolPluginId(subscription) {
  const id = subscription?.node?.id || ''
  const parts = id.split(':').filter(Boolean)
  if (parts.length < 3) return null
  return `${parts[1]}-${parts[2]}`
}

/**
 * Call `feature(action, subscription)` on the loaded tool sub-plugin and
 * return its VNodes as an array. Degrades to `[]` when nothing is
 * registered, the plugin lacks the action, or the call throws — a
 * sub-plugin must never break the parent's rendering. Unknown-action
 * errors are swallowed (the plugin chose not to implement); anything else
 * is surfaced to the console under `[plugin:<label>]`.
 *
 * @param {object} subscription
 * @param {string} action      feature name (e.g. 'renderFeatures')
 * @param {string} [label]     log scope, defaults to the service segment
 */
export function delegateFeature(subscription, action, label) {
  const subId = toolPluginId(subscription)
  if (!subId) return []
  const plugin = registry.get(subId)
  if (typeof plugin?.feature !== 'function') return []
  try {
    const result = plugin.feature(action, subscription)
    if (result == null) return []
    return Array.isArray(result) ? result : [result]
  } catch (err) {
    if (!new RegExp(`no feature ["']${action}["']`).test(err?.message || '')) {
      console.warn(`[plugin:${label || subId.split('-')[0]}] delegate to ${subId}.${action} threw`, err)
    }
    return []
  }
}
