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
 *   1. node.uiClasses
 *      a. an explicit `mdi-*` or `fa-*` token → <i> with the matching
 *         font prefix and any remaining classes
 *      b. `$Foo` shorthand → small text badge
 *      c. otherwise the raw classes are spread on a <span> (legacy
 *         CSS-driven badges)
 *   2. id with fewer than 3 fragments (i.e. service-only) → wrench
 *   3. otherwise an <img> at
 *      /main/service/{service}/{tool}/img/{tool}.png
 *      with `.broken` set on load failure for graceful fallback.
 *
 * The image URL is built against the host's build-time base
 * (`import.meta.env.BASE_URL` of *this* module, evaluated at host build
 * time = `/ligoj/`) so the path resolves correctly under the host's
 * deployment regardless of the plugin's own Vite base.
 */
import { defineComponent, h } from 'vue'

const APP_BASE = import.meta.env.BASE_URL

/**
 * Plugins still ship Font-Awesome class strings on their `uiClasses`
 * field, but the new Vue host bundles only MDI. This map translates the
 * known legacy FA tokens to MDI equivalents so a Git plug-in keeps
 * showing a Git mark instead of an empty placeholder. Unknown values
 * pass through unchanged so explicit `mdi-*` strings still work.
 */
const FA_TO_MDI = {
  'far fa-id-badge':  'mdi-badge-account-outline',
  'fa fa-suitcase':   'mdi-briefcase-variant',
  'fa fa-database':   'mdi-database-outline',
  'fab fa-jenkins':   'mdi-flask',
  'fa fa-git':        'mdi-git',
  'fa fa-github':     'mdi-github',
  'fa fa-gitlab':     'mdi-gitlab',
  'fa fa-industry':   'mdi-factory',
  'fab fa-jira':      'mdi-jira',
  'fab fa-confluence':'mdi-gitlab',
  'fa fa-envelope':   'mdi-email-outline',
  'fab fa-aws':       'mdi-aws',
  'fab fa-windows':   'mdi-azure',
  'fas fa-cloud':     'mdi-cloud-outline',
}

function convertFromFontAwesome(uiClasses) {
  return FA_TO_MDI[uiClasses] || uiClasses
}

export function nodeIcon(node) {
  const id = (typeof node === 'string' ? node : node?.id) || ''
  const fragments = id.split(':')
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

  if (fragments.length < 3) {
    return h('i', { class: 'mdi mdi-wrench fa-fw' })
  }

  const url = `${APP_BASE}main/service/${fragments[1]}/${fragments[2]}/img/${fragments[2]}.png`
  return h('img', {
    src: url,
    alt: '',
    class: 'tool-icon',
    onError: (e) => { e.target.classList.add('broken') },
  })
}

export default defineComponent({
  name: 'NodeIcon',
  props: { node: { type: [Object, String], default: null } },
  setup(props) {
    return () => nodeIcon(props.node)
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
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 500;
  line-height: 1.4;
}
</style>
