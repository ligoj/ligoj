import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { promoteTitleToTooltip } from '@/utils/promoteTitleToTooltip.js'

// Decode a promoted node: it's a <v-tooltip> whose activator slot yields
// the original (title-stripped) VNode and whose default slot yields one
// <div> per tooltip line.
const isTooltip = (n) => n?.type?.name === 'VTooltip'
const activatorOf = (tip) => tip.children.activator({ props: {} })
const linesOf = (tip) => tip.children.default().map((d) => d.children)

describe('promoteTitleToTooltip()', () => {
  it('passes through non-VNodes untouched', () => {
    expect(promoteTitleToTooltip('text')).toBe('text')
    expect(promoteTitleToTooltip(42)).toBe(42)
    expect(promoteTitleToTooltip(null)).toBeNull()
    expect(promoteTitleToTooltip(undefined)).toBeUndefined()
  })

  it('leaves a VNode without a title untouched', () => {
    const node = h('span', { class: 'plain' }, 'x')
    expect(promoteTitleToTooltip(node)).toBe(node)
  })

  it('wraps a top-level title in a v-tooltip and strips the native title', () => {
    const out = promoteTitleToTooltip(h('button', { title: 'Hello', class: 'b' }, 'go'))
    expect(isTooltip(out)).toBe(true)
    const activator = activatorOf(out)
    expect(activator.props.title).toBeNull() // native attribute removed
    expect(String(activator.props.class)).toContain('b')
    expect(linesOf(out)).toEqual(['Hello'])
  })

  it('recurses arrays / fragments', () => {
    const out = promoteTitleToTooltip([
      h('button', { title: 'A' }, '1'),
      h('button', { title: 'B' }, '2'),
      h('span', {}, 'plain'),
    ])
    expect(out.map(isTooltip)).toEqual([true, true, false])
  })

  it('promotes a NESTED title inside plain-element array children', () => {
    // <span class=wrap>[<span class=inner title=Tip/>]</span>
    const out = promoteTitleToTooltip(
      h('span', { class: 'wrap' }, [h('span', { class: 'inner', title: 'Tip' }, 'i')]),
    )
    // The wrapper itself has no title → returned as a span, not a tooltip.
    expect(isTooltip(out)).toBe(false)
    expect(out.type).toBe('span')
    // Its child IS now a tooltip.
    const child = out.children[0]
    expect(isTooltip(child)).toBe(true)
    expect(linesOf(child)).toEqual(['Tip'])
  })

  it('renders a multi-line title as one row per line', () => {
    const out = promoteTitleToTooltip(h('span', { title: 'name\nValue: 5\nmeaning' }, 'x'))
    expect(linesOf(out)).toEqual(['name', 'Value: 5', 'meaning'])
  })

  it('does not recurse into a component\'s slot-function children', () => {
    // Component children are a slot function, not an array — the inner
    // title must NOT be promoted (only the component's own title would be).
    let called = false
    const out = promoteTitleToTooltip(
      h({ name: 'Fake', render: () => null }, { class: 'c' }, () => { called = true; return [h('i', { title: 'inner' })] }),
    )
    // No title on the component itself → untouched, slot left uncalled.
    expect(isTooltip(out)).toBe(false)
    expect(called).toBe(false)
  })
})
