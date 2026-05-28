<script>
/**
 * GlobalToolsList — sidebar slot for backend-driven, per-user "global
 * tools" links. The session payload's `userSettings.globalTools` is an
 * array of `{ node, parameters }` where `node` is a `NodeVo`-shaped
 * object (id, uiClasses, refined chain, mode, …) and `parameters` is
 * the per-instance config blob. The owning tool plugin (resolved from
 * the first three id segments via `pluginIdFromKey`, so
 * `service:km:confluence:dig` → `km-confluence`) returns one or more
 * VNodes via `feature('renderGlobal', { node, parameters })`, and the
 * host mounts them above the About menu.
 *
 * Mirrors the legacy `home.js#renderGlobal` flow:
 *   $cascade.requireTool(globalTool.id, ($tool) =>
 *     $tool.renderGlobal($globalContainer, globalTool))
 *
 * Lazy-loads each entry's plugin on first observation. A plugin that
 * doesn't implement `renderGlobal` (or fails to load) is skipped
 * silently — the slot degrades to nothing.
 */
import { defineComponent, h, ref, watch } from 'vue'
import registry from '@/plugins/registry.js'
import { loadPlugin, pluginIdFromKey } from '@/plugins/loader.js'
import { useAuthStore } from '@/stores/auth.js'

/**
 * Resolves a `globalTool` entry to the plugin that owns its rendering.
 * Mirrors the rule used everywhere else in the host: drop everything
 * past the tool segment (the instance, if any) and run the remaining
 * `service:<svc>:<tool>` through `pluginIdFromKey`. So
 * `service:km:confluence:dig` → `km-confluence`. Returns `null` for
 * malformed entries the dispatcher can't act on.
 */
function pluginIdForTool(tool) {
  const id = tool?.node?.id
  if (typeof id !== 'string') return null
  const parts = id.split(':').filter(Boolean).slice(0, 3)
  if (parts.length < 2) return null
  return pluginIdFromKey(parts.join(':')) || null
}

export default defineComponent({
  name: 'GlobalToolsList',
  setup() {
    const auth = useAuthStore()
    // Bumped each time a lazy-load completes so the render function
    // re-runs and the newly-registered plugin gets a chance to paint.
    // The list of tools rarely changes after session boot, so a tick
    // counter is enough — no need to make the registry itself reactive.
    const loadTick = ref(0)

    /** Trigger lazy-loads for every tool whose plugin isn't registered yet. */
    function syncLoads(tools) {
      const pending = new Set()
      for (const tool of tools || []) {
        const pluginId = pluginIdForTool(tool)
        if (!pluginId || registry.has(pluginId) || pending.has(pluginId)) continue
        pending.add(pluginId)
        loadPlugin(pluginId)
          .then(() => { loadTick.value++ })
          .catch(() => { /* missing bundle — silently skip */ })
      }
    }

    watch(() => auth.globalTools, syncLoads, { immediate: true })

    return () => {
      // Touch the tick so reactivity tracks lazy-load completion.
      // eslint-disable-next-line no-unused-expressions
      loadTick.value
      const nodes = []
      for (const tool of auth.globalTools || []) {
        const pluginId = pluginIdForTool(tool)
        if (!pluginId) continue
        const plugin = registry.get(pluginId)
        if (typeof plugin?.feature !== 'function') continue
        try {
          // Pass the entry as `{ node, parameters }` — `node` is the
          // full `NodeVo` (id, uiClasses, refined chain, mode, …), so
          // plugins that want richer info (e.g. branding the link from
          // `node.uiClasses` or walking the parent chain to discover
          // the service) don't have to re-fetch the node.
          const out = plugin.feature('renderGlobal', tool)
          if (out == null) continue
          if (Array.isArray(out)) nodes.push(...out)
          else nodes.push(out)
        } catch (err) {
          // `no feature "renderGlobal"` is expected for plugins that
          // don't opt in — stay quiet for that one. Surface anything else.
          if (!/no feature ["']renderGlobal["']/.test(err?.message || '')) {
            console.warn(`[GlobalToolsList] ${pluginId}.renderGlobal threw`, err)
          }
        }
      }
      if (!nodes.length) return null
      // Wrap in a v-list so the items inherit the sidebar's density and
      // navigation styling. Using `v-list density="compact" nav` keeps
      // the visual rhythm consistent with the About row below it.
      return h('div', { class: 'global-tools' }, [
        h(resolveListTag(), { density: 'compact', nav: true }, () => nodes),
      ])
    }
  },
})

// Vuetify components are globally registered via the host's
// `plugins/vuetify.js`, so the runtime `<v-list>` resolves by name
// without an import here. Returning a string lets `h()` resolve it
// through Vue's runtime registry; the alternative would be importing
// `VList` from `vuetify/components` and pulling that into the host
// chunk twice (once here, once via the plugin import map).
function resolveListTag() {
  return 'v-list'
}
</script>
