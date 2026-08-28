import { computed, toValue } from 'vue'
import registry, { collectFeature } from '@/plugins/registry.js'

/**
 * Generic plugin extension point for the VIEW TOOLBARS (the action bar of a
 * list view — users, groups, companies, projects, delegates — or of the
 * provisioning quote screen).
 *
 * Any registered plugin may expose an `actionExtension` feature. It is
 * invoked with the toolbar context `{ target, ...viewContext }` — `target`
 * identifies the extended view (e.g. 'user', 'prov-quote') — and returns a
 * contribution object (or null/undefined to opt out):
 *
 *   actionExtension(ctx) {
 *     if (ctx.target !== 'prov-quote') return null
 *     return {
 *       // Vue component mounted in the view's toolbar, after the built-in
 *       // actions, with a single `context` prop (the object above). The
 *       // component owns its button(s) and any dialog / navigation they
 *       // open; match the chrome of the target (LjButton in the list views,
 *       // icon `v-btn` in the quote tools strip).
 *       action: MyToolbarAction,
 *     }
 *   }
 *
 * `target` may be a string or a ref/getter (an empty target disables the
 * polling). The context supplier is re-evaluated reactively, so contributions
 * can react to the view state (selection, loaded entity, ...). Consumers usually go
 * through `LjPageHeader`'s `actions-target` / `actions-context` props; views
 * with a bespoke toolbar call this composable and mount `actions` themselves:
 *
 *   <component :is="a" v-for="(a, i) in actions" :key="i" :context="context" />
 */
export function useActionExtensions(target, contextSupplier = () => ({})) {
  const context = computed(() => ({ target: toValue(target) || '', ...contextSupplier() }))

  const actions = computed(() => {
    // No target (e.g. a page header without `actions-target`) = no polling
    if (!context.value.target) return []
    // Subscribe to lazy plugin loads; the collector skips non-contributors
    void registry.version.value
    return collectFeature('actionExtension', context.value)
      .filter((e) => e.action)
      .map((e) => e.action)
  })

  return { actions, context }
}
