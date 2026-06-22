<script>
/**
 * AdminNavExtras — sidebar slot for plugin-contributed Administration
 * menu entries.
 *
 * This is the menu-level analogue of `PluginFeatures` (subscription rows)
 * and `GlobalToolsList` (sidebar global tools): a *render delegation*
 * point that lets ANY plugin add items to the shared Administration
 * ("System") menu without the host knowing about them.
 *
 * Contract — a plugin opts in by implementing the `renderAdmin` feature:
 *
 *   feature('renderAdmin') → VNode | VNode[] | null
 *
 * returning one or more `<v-list-item>` VNodes (built with
 * `h(VListItem, { prependIcon, title, to })` against the host's
 * re-exported `VListItem`).
 *
 * Rendering: contributions are grouped PER plugin. Each contributing
 * plugin gets, in order:
 *   1. a divider (made visible against the dark primary drawer — see styles),
 *   2. a thin ownership notice = the plugin's display label (e.g.
 *      "Provisioning"), so admins can see which plugin owns the entries
 *      below,
 *   3. the plugin's own `<v-list-item>` entries.
 * Nothing renders when no plugin contributes.
 *
 * Resolution differs from GlobalToolsList: there is no backend-driven
 * list of ids here, so we poll EVERY registered plugin for the action.
 * `registry.version` is reactive, so a plugin lazily loaded after first
 * paint re-runs this render and its entries appear without a refresh.
 * A plugin that doesn't implement `renderAdmin` (the common case)
 * throws the standard "no feature" error from its dispatcher, which we
 * swallow silently — only real errors surface via console.warn.
 */
import { defineComponent, h } from 'vue'
import registry from '@/plugins/registry.js'
import { useI18nStore } from '@/stores/i18n.js'

export default defineComponent({
  name: 'AdminNavExtras',
  setup() {
    const i18n = useI18nStore()

    return () => {
      // Track reactivity: re-run when the set of loaded plugins changes
      // (lazy load after first paint) and when the locale switches (so the
      // plugin-built entry titles re-localize). `void` keeps these as pure
      // dependency reads without an unused-expression lint warning.
      void registry.version.value
      void i18n.locale

      const groups = []
      for (const plugin of registry.list()) {
        if (typeof plugin?.feature !== 'function') continue
        try {
          const out = plugin.feature('renderAdmin')
          if (out == null) continue
          const entries = Array.isArray(out) ? out.filter(Boolean) : [out]
          if (entries.length) groups.push({ plugin, entries })
        } catch (err) {
          // `no feature "renderAdmin"` is expected for plugins that don't
          // opt in — stay quiet for that one. Surface anything else.
          if (!/no feature ["']renderAdmin["']/.test(err?.message || '')) {
            console.warn(`[AdminNavExtras] ${plugin.id}.renderAdmin threw`, err)
          }
        }
      }

      if (!groups.length) return null

      // Per-plugin: a visible divider, a thin ownership notice = the
      // plugin's display label, then that plugin's entries. Vuetify's
      // v-divider is globally registered so the string tag resolves at
      // runtime (same trick as GlobalToolsList). The ownership notice is
      // a plain element styled like a subheader rather than
      // `<v-list-subheader>` — the latter's default-slot string doesn't
      // surface to the DOM under jsdom, and the plain element gives full
      // control of the quiet styling on the dark drawer.
      const nodes = []
      for (const { plugin, entries } of groups) {
        nodes.push(h('v-divider', { class: 'admin-nav-extras-divider' }))
        nodes.push(
          h(
            'div',
            { class: 'admin-nav-extras-owner v-list-subheader' },
            plugin.label || plugin.id,
          ),
        )
        nodes.push(...entries)
      }
      return nodes
    }
  },
})
</script>

<style scoped>
/* The navigation drawer is `color="primary" dark`, so Vuetify's default
 * low-opacity divider/subheader are almost invisible. Lift both onto the
 * light "on-primary" surface tint so the plugin boundary actually shows. */
.admin-nav-extras-divider {
  border-color: rgba(255, 255, 255, 0.28) !important;
  opacity: 1;
  margin-top: 4px;
}
.admin-nav-extras-owner {
  /* Thin, quiet ownership notice — smaller and lighter than nav items,
   * but legible on the dark drawer. Title-case is preserved (no
   * uppercase) so the plugin label reads as its display name. */
  display: flex;
  align-items: center;
  font-size: 0.7rem;
  line-height: 1.4;
  letter-spacing: 0.02em;
  font-weight: 600;
  opacity: 0.75;
  min-height: 24px;
  padding: 2px 16px 0;
}
</style>
