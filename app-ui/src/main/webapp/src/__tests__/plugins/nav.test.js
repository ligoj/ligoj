import { describe, it, expect } from 'vitest'
import { mergeNav, navKeyMatches } from '../../plugins/nav.js'

// A trimmed BASE_NAV shaped like the host's (Home / Projects / Administration).
const BASE = [
  { labelKey: 'nav.home', icon: 'mdi-home', route: '/', auth: 'home' },
  { labelKey: 'nav.projects', icon: 'mdi-folder', route: '/project', match: '/project', auth: 'home' },
  {
    labelKey: 'nav.system', icon: 'mdi-cog', match: '/system', children: [
      { labelKey: 'nav.plugins', route: '/system/plugin', match: '/system/plugin', auth: 'system/plugin' },
      { labelKey: 'nav.nodes', route: '/system/node', match: '/system/node', auth: 'system/node' },
    ],
  },
]

const labels = (menus) => menus.map((m) => m.labelKey ?? m.label ?? m.id)
const childLabels = (menu) => (menu.children || []).map((c) => c.labelKey ?? c.label ?? c.id)

describe('navKeyMatches', () => {
  it('matches by id, labelKey, route or match', () => {
    const item = { id: 'identity', labelKey: 'nav.identity', route: '/id/user', match: '/id' }
    expect(navKeyMatches(item, 'identity')).toBe(true)
    expect(navKeyMatches(item, 'nav.identity')).toBe(true)
    expect(navKeyMatches(item, '/id/user')).toBe(true)
    expect(navKeyMatches(item, '/id')).toBe(true)
    expect(navKeyMatches(item, 'nope')).toBe(false)
    expect(navKeyMatches(item, null)).toBe(false)
    expect(navKeyMatches(null, 'identity')).toBe(false)
  })
})

describe('mergeNav', () => {
  it('returns the base menus unchanged when there are no contributions', () => {
    expect(labels(mergeNav(BASE, []))).toEqual(['nav.home', 'nav.projects', 'nav.system'])
  })

  it('inserts a new top-level menu before a named sibling', () => {
    const identity = {
      id: 'identity', labelKey: 'nav.identity', match: '/id', before: 'nav.projects',
      children: [{ labelKey: 'nav.users', route: '/id/user', auth: 'id/user' }],
    }
    expect(labels(mergeNav(BASE, [identity]))).toEqual(['nav.home', 'nav.identity', 'nav.projects', 'nav.system'])
  })

  it('inserts a new top-level menu after a named sibling', () => {
    const extra = { id: 'x', label: 'X', after: 'nav.home', children: [{ label: 'x1', route: '/x/1' }] }
    expect(labels(mergeNav(BASE, [extra]))).toEqual(['nav.home', 'X', 'nav.projects', 'nav.system'])
  })

  it('appends a new top-level menu when before/after is absent or unresolved', () => {
    const a = { id: 'a', label: 'A', children: [{ label: 'a', route: '/a' }] }
    const b = { id: 'b', label: 'B', before: 'nope', children: [{ label: 'b', route: '/b' }] }
    expect(labels(mergeNav(BASE, [a, b]))).toEqual(['nav.home', 'nav.projects', 'nav.system', 'A', 'B'])
  })

  it('inserts entries into an existing menu via { menu, children }, appended after built-ins', () => {
    const prov = {
      menu: 'nav.system',
      children: [
        { id: 'prov-catalog', label: 'Catalog', route: '/prov/catalog', divider: 'Provisioning' },
        { id: 'prov-currency', label: 'Currency', route: '/prov/currency' },
      ],
    }
    const system = mergeNav(BASE, [prov]).find((m) => m.match === '/system')
    expect(childLabels(system)).toEqual(['nav.plugins', 'nav.nodes', 'Catalog', 'Currency'])
    expect(system.children.find((c) => c.id === 'prov-catalog').divider).toBe('Provisioning')
  })

  it('positions an inserted entry before/after a named sibling within the menu', () => {
    const insert = {
      menu: 'nav.system',
      children: [{ id: 'top', label: 'Top', route: '/system/top', before: 'nav.plugins' }],
    }
    const system = mergeNav(BASE, [insert]).find((m) => m.match === '/system')
    expect(childLabels(system)).toEqual(['Top', 'nav.plugins', 'nav.nodes'])
  })

  it('augments an existing top-level menu matched by labelKey (children merged, not duplicated)', () => {
    const more = { labelKey: 'nav.system', children: [{ label: 'Extra', route: '/system/extra' }] }
    const merged = mergeNav(BASE, [more])
    expect(labels(merged)).toEqual(['nav.home', 'nav.projects', 'nav.system']) // no new top-level menu
    const system = merged.find((m) => m.match === '/system')
    expect(childLabels(system)).toEqual(['nav.plugins', 'nav.nodes', 'Extra'])
  })

  it('keeps contribution order among several entries anchored to the same sibling', () => {
    const insert = {
      menu: 'nav.system',
      children: [
        { label: 'A', route: '/a', before: 'nav.nodes' },
        { label: 'B', route: '/b', before: 'nav.nodes' },
      ],
    }
    const system = mergeNav(BASE, [insert]).find((m) => m.match === '/system')
    expect(childLabels(system)).toEqual(['nav.plugins', 'A', 'B', 'nav.nodes'])
  })

  it('does not mutate the base nav or the contribution objects', () => {
    const baseCopy = JSON.parse(JSON.stringify(BASE))
    const contrib = { menu: 'nav.system', children: [{ label: 'Z', route: '/z' }] }
    const contribCopy = JSON.parse(JSON.stringify(contrib))
    mergeNav(BASE, [contrib])
    expect(BASE).toEqual(baseCopy)
    expect(contrib).toEqual(contribCopy)
  })

  it('ignores null contributions and inserts targeting a missing menu', () => {
    const insert = { menu: 'nav.missing', children: [{ label: 'Q', route: '/q' }] }
    expect(labels(mergeNav(BASE, [null, insert]))).toEqual(['nav.home', 'nav.projects', 'nav.system'])
  })
})
