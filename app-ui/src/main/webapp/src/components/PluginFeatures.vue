<script>
/**
 * PluginFeatures — generic delegation slot for a subscription row.
 *
 * The host calls one of the plugin's `feature()` actions and mounts the
 * VNodes it returns directly — no HTML interpretation, no descriptor
 * vocabulary to learn. Each plugin paints its own pixels.
 *
 * The `action` prop selects which delegation point to invoke; today the
 * host uses two:
 *   - `renderFeatures`   — action icons next to the unsubscribe button
 *   - `renderDetailsKey` — resource-summary chips in the details column
 *
 * Resolution:
 *   subscription.node.id              → plugin id (second segment)
 *   registry.get(pluginId).feature    → invoke(action, sub)
 *
 * Lazy-loads the plugin if it hasn't been pre-loaded. If the plugin
 * exposes no matching action (or throws), nothing renders — the slot
 * degrades cleanly.
 */
import { defineComponent, h, ref, watchEffect, cloneVNode } from 'vue'
import { VTooltip } from 'vuetify/components'
import registry from '@/plugins/registry.js'
import { loadPlugin } from '@/plugins/loader.js'
import { nodePluginId } from '@/utils/nodeType.js'

/**
 * Transparently upgrade any plugin-contributed VNode whose props
 * carry a `title` into a Vuetify `<v-tooltip>` wrapper, so the
 * rendered hint matches the host's theme/preset (font, surface,
 * shadows) instead of falling back to the browser's small grey
 * native popover.
 *
 * Plugins keep writing `h(VBtn, { title: '…' }, …)` — no plugin
 * code change needed — and we promote it here, centrally. This is
 * the trick that lets us roll the tooltip improvement to
 * `plugin-id`, `plugin-prov`, and any future plugin in one place.
 *
 * The original `title:` is stripped from the cloned child so the
 * browser doesn't ALSO render its native tooltip on top of the
 * Vuetify one (double-tooltip-on-hover bug). `aria-describedby` is
 * still set by VTooltip itself, so accessibility is preserved.
 *
 * Vnodes without a `title` (or that aren't real VNodes — strings,
 * numbers, null) flow through untouched.
 */
function promoteTitleToTooltip(vnode) {
  // Arrays / Fragments — recurse so plugins can return either a
  // single button or a list of them and both shapes get upgraded.
  if (Array.isArray(vnode)) return vnode.map(promoteTitleToTooltip)
  // Bail on anything that isn't a real VNode (text, null, undefined,
  // raw numbers). cloneVNode would throw on those.
  if (!vnode || typeof vnode !== 'object' || !vnode.type) return vnode
  const title = vnode.props?.title
  if (!title || typeof title !== 'string') return vnode
  return h(
    VTooltip,
    { text: title, location: 'bottom' },
    {
      activator: ({ props: activatorProps }) =>
        // `title: null` overrides the original so the DOM doesn't get
        // the native attribute. `...activatorProps` hands VTooltip's
        // hover/focus listeners + ARIA wiring onto the child.
        cloneVNode(vnode, { ...activatorProps, title: null }),
    },
  )
}

export default defineComponent({
  name: 'PluginFeatures',
  props: {
    subscription: { type: Object, required: true },
    /**
     * Name of the plugin `feature()` action to invoke. Plugins that
     * don't implement the action are skipped silently.
     */
    action: { type: String, default: 'renderFeatures' },
  },
  setup(props) {
    // Bumped after a lazy load completes so the render function re-runs
    // and the now-registered plugin gets a chance to contribute.
    const loadTick = ref(0)

    watchEffect(async () => {
      const id = nodePluginId(props.subscription?.node)
      if (!id || registry.has(id)) return
      try {
        await loadPlugin(id)
        loadTick.value++
      } catch {
        // Plugin couldn't be loaded — silently render nothing.
      }
    })

    return () => {
      // Touch the tick so the render function tracks lazy-load completion.
      void loadTick.value
      const id = nodePluginId(props.subscription?.node)
      if (!id) return null
      const plugin = registry.get(id)
      if (typeof plugin?.feature !== 'function') return null
      try {
        const result = plugin.feature(props.action, props.subscription)
        // Walk the plugin output and upgrade any `title:` to a
        // theme-aware Vuetify tooltip. Plugins keep using the plain
        // `title` prop — see `promoteTitleToTooltip` above.
        return result == null ? null : promoteTitleToTooltip(result)
      } catch (err) {
        // Unknown actions are expected (plugin chose not to implement).
        // Real errors are worth surfacing.
        if (!new RegExp(`no feature ["']${props.action}["']`).test(err?.message || '')) {
          console.warn(`[PluginFeatures] ${id}.${props.action} threw`, err)
        }
        return null
      }
    }
  },
})
</script>
