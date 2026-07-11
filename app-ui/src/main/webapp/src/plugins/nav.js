/*
 * Sidebar navigation merge engine.
 *
 * The host owns a static `BASE_NAV` (Home / Projects / Administration …).
 * Plugins add to the sidebar declaratively through the `renderNav` feature
 * (and the legacy VNode-based `renderAdmin`, which the caller adapts into the
 * same shape). A contribution is a plain object — never a VNode — so it can be
 * merged, positioned and auth-filtered as data.
 *
 * Contribution shapes
 * -------------------
 *   1. Top-level menu — creates a new sidebar section, or augments an existing
 *      one matched by id / labelKey / match:
 *        { id, label | labelKey, icon, match, before?, after?, children:[…] }
 *
 *   2. Insert into an existing menu (e.g. prov → Administration):
 *        { menu: '<id|labelKey|match of target menu>', children:[…] }
 *
 *   3. Each child entry:
 *        { id?, label | labelKey, icon, route, match?, auth?,
 *          divider?: string | true,   // separator rendered BEFORE this entry
 *          before?: '<sibling key>', after?: '<sibling key>' }
 *
 * Positioning
 * -----------
 * `before` / `after` target a sibling by id, labelKey, route or match. The
 * first match wins; an entry with neither (or an unresolved target) is
 * appended in contribution order. Several entries targeting the same anchor
 * keep their contribution order (A, B, …, anchor).
 *
 * Everything here operates on the RAW items (labelKey, not the localized
 * label) so the caller localizes + auth-filters afterwards. Inputs are never
 * mutated — `BASE_NAV` and the plugin objects are cloned before splicing.
 */

/** True when `item` can be addressed by `key` (its id/labelKey/route/match). */
export function navKeyMatches(item, key) {
  if (key == null || item == null) return false
  return item.id === key || item.labelKey === key || item.route === key || item.match === key
}

/** A top-level contribution augments an existing section when they share an
 *  id, labelKey or match — otherwise it's a brand-new section. */
function isSameMenu(menu, contribution) {
  return (
    navKeyMatches(menu, contribution.id) ||
    navKeyMatches(menu, contribution.labelKey) ||
    (contribution.match != null && menu.match === contribution.match)
  )
}

/** Return a new array with `entries` spliced into `list` honoring each
 *  entry's before/after anchor (see module header). */
function insertPositioned(list, entries) {
  const out = list.slice()
  for (const e of entries) {
    let idx = out.length
    if (e.before != null) {
      const i = out.findIndex((x) => navKeyMatches(x, e.before))
      if (i >= 0) idx = i
    } else if (e.after != null) {
      const i = out.findIndex((x) => navKeyMatches(x, e.after))
      if (i >= 0) idx = i + 1
    }
    out.splice(idx, 0, e)
  }
  return out
}

/**
 * Merge plugin `contributions` into `baseNav`, returning the assembled
 * top-level menu list (raw — labels still keyed, nothing auth-filtered).
 *
 * Two passes so an insert can target a plugin-contributed section too:
 *   1. Top-level menus — merge into a matching existing section or queue as new.
 *   2. `{ menu }` inserts — splice their children into the target section.
 */
export function mergeNav(baseNav, contributions = []) {
  const list = (contributions || []).filter(Boolean)
  const topLevel = list.filter((c) => c.menu == null)
  const inserts = list.filter((c) => c.menu != null)

  // Shallow-clone each menu; copy children arrays since we splice into them.
  let menus = baseNav.map((m) => ({ ...m, children: m.children ? m.children.slice() : m.children }))

  // 1. Top-level contributions.
  const newTop = []
  for (const c of topLevel) {
    const existing = menus.find((m) => isSameMenu(m, c))
    if (existing) {
      existing.children = insertPositioned(existing.children || [], c.children || [])
      if (!existing.icon && c.icon) existing.icon = c.icon
    } else {
      newTop.push({ ...c, children: (c.children || []).slice() })
    }
  }
  menus = insertPositioned(menus, newTop)

  // 2. Inserts into existing (base or newly-added) menus.
  for (const c of inserts) {
    const target = menus.find((m) => navKeyMatches(m, c.menu))
    if (!target) continue
    target.children = insertPositioned(target.children || [], c.children || [])
  }
  return menus
}
