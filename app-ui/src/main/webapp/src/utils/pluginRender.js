/*
 * pluginRender — shared VNode builders for plugin subscription-row hooks.
 *
 * Almost every tool plugin's `renderFeatures` / `renderDetails*` returned
 * the SAME two shapes, hand-rolled per plugin:
 *   - an icon-only link button (the "home"/console shortcut), and
 *   - an icon + text chip (the resource key / a live detail).
 * They differed only in icon, href and the (already-translated) tooltip
 * label. These helpers centralise the shape so a plugin writes one line
 * instead of a 12-line `h(VBtn, …)` / `h(VChip, …)` literal.
 *
 * TOOLTIPS ARE IMPLICIT: both helpers set the plain `title:` prop and rely
 * on the host's `promoteTitleToTooltip` (PluginFeatures) to upgrade it to
 * a themed `<v-tooltip>`. Callers never import VTooltip. Pass `title`
 * already translated (the i18n keys live in the plugin).
 *
 * Re-exported from `@ligoj/host`; a plugin's Vite build keeps the host
 * external, so there is exactly ONE copy of these (and of Vuetify) at
 * runtime.
 */
import { h } from 'vue'
import { VBtn, VChip, VIcon } from 'vuetify/components'

/**
 * Icon-only action button for a `renderFeatures` row. Typically an
 * external link (`href`, opened in a new tab with a safe `rel`), but also
 * covers in-app navigation (`to`), pure click handlers (`onClick`) and
 * file downloads (`download`).
 *
 *   renderServiceLink({ icon: 'mdi-home', href, title: t('…') })
 *
 * @param {object}   o
 * @param {string}   o.icon      mdi icon name
 * @param {string}  [o.title]    tooltip label (already translated)
 * @param {string}  [o.href]     external URL → opens in a new tab
 * @param {string|object} [o.to] router-link target (in-app navigation)
 * @param {Function}[o.onClick]  click handler
 * @param {boolean} [o.disabled]
 * @param {string}  [o.download] `download` attribute (for href downloads)
 * @param {string}  [o.color]    Vuetify colour (e.g. 'error')
 * @param {string}  [o.target]   link target (defaults to '_blank' for href)
 * @param {string}  [o.rel]      link rel (defaults to 'noopener noreferrer')
 */
export function renderServiceLink({ icon, title, href, to, onClick, disabled, download, color, target, rel } = {}) {
  const props = { icon: true, size: 'small', variant: 'text' }
  if (title != null) props.title = title
  if (color != null) props.color = color
  if (disabled != null) props.disabled = disabled
  if (href != null) {
    props.href = href
    props.target = target ?? '_blank'
    props.rel = rel ?? 'noopener noreferrer'
    if (download != null) props.download = download
  }
  if (to != null) props.to = to
  if (onClick) props.onClick = onClick
  return h(VBtn, props, () => h(VIcon, { size: 'small' }, () => icon))
}

/**
 * Icon + text chip for the details column (`renderDetailsKey` or a
 * `renderDetailsFeatures` summary chip).
 *
 *   renderDetailsChip({ icon: 'mdi-jira', text: pkey, title: t('…') })
 *
 * @param {object}  o
 * @param {string}  o.icon      mdi icon name
 * @param {*}       o.text      chip label (coerced to String)
 * @param {string} [o.title]    tooltip label (already translated)
 * @param {string} [o.color]    Vuetify colour (e.g. 'primary')
 * @param {string} [o.size]     chip + icon size (defaults 'small')
 * @param {string} [o.variant]  chip variant (defaults 'tonal')
 */
export function renderDetailsChip({ icon, text, title, color, size = 'small', variant = 'tonal' } = {}) {
  const props = { size, variant, class: 'mr-1' }
  if (title != null) props.title = title
  if (color != null) props.color = color
  return h(VChip, props, () => [h(VIcon, { start: true, size }, () => icon), ' ', String(text)])
}
