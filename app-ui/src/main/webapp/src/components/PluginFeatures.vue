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
import { defineComponent, ref, watchEffect } from 'vue'
import registry from '@/plugins/registry.js'
import { loadPlugin } from '@/plugins/loader.js'
import { nodePluginId } from '@/utils/nodeType.js'
// Implicit tooltip mechanism: any `title:` on a plugin-contributed VNode
// (top-level OR nested) is upgraded to a themed <v-tooltip> here, so no
// plugin imports VTooltip. See the util for the recursion / multi-line
// rules.
import { promoteTitleToTooltip } from '@/utils/promoteTitleToTooltip.js'

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
