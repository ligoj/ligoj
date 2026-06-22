/*
 * promoteTitleToTooltip — the host's implicit tooltip mechanism for
 * plugin-contributed VNodes.
 *
 * Plugins (and the host's own delegation helpers) keep writing the plain
 * `title:` prop on the VNodes they return from `renderFeatures` /
 * `renderDetails*`. The host walks that output and upgrades every `title:`
 * into a Vuetify `<v-tooltip>` so the hint matches the app's theme/preset
 * (font, surface, shadow) instead of the browser's small grey native
 * popover — and so NO plugin needs to import VTooltip or wrap its own
 * activator. This is the single place the behaviour is defined.
 *
 * Two properties make it cover every shape a plugin returns:
 *   1. RECURSION — it descends into plain-element array children, so a
 *      `title:` nested inside a wrapper (e.g. a metric badge inside a
 *      `<span class="metrics">`) is promoted too, not just the top-level
 *      delegation node. Component children are slot FUNCTIONS (never
 *      arrays), so a chip's own inner icon is left untouched — only the
 *      chip's own `title:` becomes a tooltip.
 *   2. MULTI-LINE — a `title:` carrying "\n" renders as one row per line,
 *      so a "name / value / meaning" hint reads cleanly. Plugins that used
 *      to hand-build a multi-row `<v-tooltip>` just join their lines with
 *      "\n" now.
 *
 * The original `title:` is stripped from the activator clone so the
 * browser doesn't ALSO render its native tooltip on top of the Vuetify
 * one (the double-tooltip-on-hover bug). `aria-describedby` is still wired
 * by VTooltip, so accessibility is preserved.
 */
import { h, cloneVNode, isVNode } from 'vue'
import { VTooltip } from 'vuetify/components'

export function promoteTitleToTooltip(vnode) {
  // Arrays / Fragments — recurse so a plugin can return a single VNode or
  // a list of them and both shapes get upgraded.
  if (Array.isArray(vnode)) return vnode.map(promoteTitleToTooltip)
  // Bail on anything that isn't a real VNode (strings, numbers, null,
  // undefined) — cloneVNode would throw on those.
  if (!isVNode(vnode) || !vnode.type) return vnode

  // Recurse FIRST into plain-element array children so a NESTED `title:`
  // is promoted before we (maybe) wrap this node itself. Only array
  // children qualify: component children are slot functions, so this never
  // reaches inside a chip/button to its decorative icon.
  let node = vnode
  if (Array.isArray(vnode.children) && vnode.children.length) {
    node = cloneVNode(vnode)
    node.children = vnode.children.map(promoteTitleToTooltip)
  }

  const title = node.props?.title
  if (!title || typeof title !== 'string') return node

  return h(
    VTooltip,
    { location: 'bottom' },
    {
      // `title: null` overrides the original so the DOM doesn't keep the
      // native attribute; `...activatorProps` hands VTooltip's hover/focus
      // listeners + ARIA wiring onto the child.
      activator: ({ props: activatorProps }) => cloneVNode(node, { ...activatorProps, title: null }),
      // One <div> per line so multi-line ("name\nValue\nmeaning") tooltips
      // read as rows; a single-line title is just one row.
      default: () => title.split('\n').map((line, i) => h('div', { key: i }, line)),
    },
  )
}

export default promoteTitleToTooltip
