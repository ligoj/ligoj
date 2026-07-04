<script>
/**
 * NodeIcon — render a Ligoj node's icon following the legacy
 * `toIcon` / `toIconBase` priority chain (see app-ui/main/main.js).
 *
 * Both the pure helper `nodeIcon(node)` and the wrapper component
 * `NodeIcon` are exported so plugins can pick whichever fits best.
 *
 *   - Inside templates:    <NodeIcon :node="someNode" />
 *   - Inside render fns:   nodeIcon(someNode)            // returns a VNode
 *
 * Priority chain:
 *   1. id with 3+ fragments (a tool / instance) → an <img> of the tool's
 *      icon FILE at /main/service/{service}/{tool}/img/{tool}.svg, falling
 *      back to `.png`, then `.broken`. The icon file is authoritative for
 *      tool/instance nodes — `uiClasses` is NOT consulted here (every tool
 *      plugin ships an icon file).
 *   2. otherwise (service-level / short ids) node.uiClasses:
 *      a. an explicit `mdi-*` or `fa-*` token → <i> with the matching
 *         font prefix and any remaining classes
 *      b. `$Foo` shorthand → small text badge
 *      c. otherwise the raw classes are spread on a <span> (legacy
 *         CSS-driven badges)
 *   3. nothing usable → wrench.
 *
 * The image URL is built against the host's build-time base
 * (`import.meta.env.BASE_URL` of *this* module, evaluated at host build
 * time = `/ligoj/`) so the path resolves correctly under the host's
 * deployment regardless of the plugin's own Vite base.
 */
import { defineComponent, h } from 'vue'
import { VChip } from 'vuetify/components'

const APP_BASE = import.meta.env.BASE_URL

/**
 * Plugins still ship Font-Awesome class strings on their `uiClasses`
 * field, but the new Vue host bundles only MDI. This map translates the
 * known legacy FA tokens to MDI equivalents so a Git plug-in keeps
 * showing a Git mark instead of an empty placeholder. Unknown values
 * pass through unchanged so explicit `mdi-*` strings still work.
 */
const FA_TO_MDI = {
  'far fa-id-badge': 'mdi-badge-account-outline',
  'fas fa-server': 'mdi-server',
  'fa fa-suitcase': 'mdi-briefcase-variant',
  'fa fa-database': 'mdi-database-outline',
  'fab fa-jenkins': 'mdi-flask',
  'fa fa-git': 'mdi-git',
  'fa fa-github': 'mdi-github',
  'fa fa-gitlab': 'mdi-gitlab',
  'fa fa-industry': 'mdi-factory',
  'fab fa-jira': 'mdi-jira',
  'fab fa-confluence': 'mdi-gitlab',
  'fa fa-envelope': 'mdi-email-outline',
  'fab fa-aws': 'mdi-aws',
  'fab fa-docker': 'mdi-microsoft-azure',
  'fab fa-windows': 'mdi-azure',
  'fas fa-cloud': 'mdi-cloud-outline',
  'fas fa-tachometer-alt': 'mdi-gauge',
  'fa fa-cogs': 'mdi-hammer',
  'fas fa-box-open': 'mdi-package-variant-closed',
  'fas fa-code-branch': 'mdi-source-branch'
}

function convertFromFontAwesome(uiClasses) {
  return FA_TO_MDI[uiClasses] || uiClasses
}

export function nodeIcon(node) {
  const id = (typeof node === 'string' ? node : node?.id) || ''
  const fragments = id.split(':')

  // Tool / instance nodes (`service:<svc>:<tool>[:<instance>]`) render their
  // tool ICON FILE — SVG first, PNG fallback, then a broken marker. `uiClasses`
  // is intentionally NOT consulted for these: every tool plugin ships an icon
  // file, which is the single source of truth for tool/instance icons.
  if (fragments.length >= 3) {
    const base = `${APP_BASE}main/service/${fragments[1]}/${fragments[2]}/img/${fragments[2]}`
    return h('img', {
      src: `${base}.svg`,
      alt: '',
      class: 'tool-icon',
      onError: (e) => {
        const el = e.target
        if (!el.dataset.pngFallback) { el.dataset.pngFallback = '1'; el.src = `${base}.png` }
        else { el.classList.add('broken') }
      },
    })
  }

  // Service-level (and other short-id) nodes have no tool icon file, so they
  // keep the `uiClasses` font / text-badge rendering, falling back to a wrench.
  const uiClasses = convertFromFontAwesome((typeof node === 'object' && node?.uiClasses) || '')
  if (uiClasses) {
    const parts = uiClasses.split(/\s+/).filter(Boolean)
    const explicit = parts.find((p) => p.startsWith('mdi-') || p.startsWith('fa-'))
    if (explicit) {
      const isMdi = explicit.startsWith('mdi-')
      const rest = parts.filter((p) => p !== explicit).join(' ')
      const cls = (isMdi ? 'mdi ' : '') + explicit + (rest ? ' ' + rest : '') + ' fa-fw'
      return h('i', { class: cls })
    }
    if (uiClasses.startsWith('$')) {
      return h('span', { class: 'icon-text' }, uiClasses.slice(1))
    }
    return h('span', { class: parts.join(' ') })
  }

  return h('i', { class: 'mdi mdi-wrench fa-fw' })
}

export default defineComponent({
  name: 'NodeIcon',
  props: {
    node: { type: [Object, String], default: null },
    /** Wrap the rendered icon (and optional text) in a v-chip. */
    chip: { type: Boolean, default: false },
    /**
     * Show a text label next to the icon. `true` resolves to
     * `node.name` (falling back to `node.id`); a string overrides the
     * label entirely; `false` (default) is icon-only.
     */
    text: { type: [Boolean, String], default: false },
    /** Forwarded to v-chip when `chip` is set. */
    size: { type: String, default: 'small' },
    color: { type: String, default: undefined },
    variant: { type: String, default: 'tonal' },
  },
  setup(props) {
    return () => {
      const icon = nodeIcon(props.node)
      const obj = typeof props.node === 'object' ? props.node : null
      const label = typeof props.text === 'string'
        ? props.text
        : (props.text ? (obj?.name || obj?.id || '') : '')

      if (!props.chip) {
        if (!label) return icon
        return h('span', { class: 'node-icon-inline' }, [icon, ' ', label])
      }

      return h(
        VChip,
        { size: props.size, color: props.color, variant: props.variant },
        () => label ? [icon, ' ', label] : [icon],
      )
    }
  },
})
</script>

<style>
/* Unscoped on purpose: plugins consume NodeIcon through @ligoj/host, the
 * host bundle's CSS is what carries these rules. Class names are unique
 * enough to avoid collision with caller-side styles. */
.tool-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.tool-icon.broken {
  opacity: 0.35;
  filter: grayscale(1);
}

.icon-text {
  display: inline-block;
  padding: 0.05em 0.4em;
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
  border-radius: var(--lj-radius-sm, 4px);
  font-size: 0.85em;
  font-weight: 500;
  line-height: 1.4;
}

.node-icon-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
}
</style>
