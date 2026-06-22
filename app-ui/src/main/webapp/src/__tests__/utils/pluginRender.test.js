import { describe, it, expect } from 'vitest'
import { renderServiceLink, renderDetailsChip } from '@/utils/pluginRender.js'

describe('renderServiceLink()', () => {
  it('builds an external-link button with safe defaults', () => {
    const n = renderServiceLink({ icon: 'mdi-home', href: 'https://x.test/p', title: 'Home' })
    expect(n.__v_isVNode).toBe(true)
    expect(n.props.href).toBe('https://x.test/p')
    expect(n.props.target).toBe('_blank')
    expect(n.props.rel).toBe('noopener noreferrer')
    expect(n.props.title).toBe('Home')
    expect(n.props.icon).toBe(true)
    expect(n.props.size).toBe('small')
    expect(n.props.variant).toBe('text')
  })

  it('honours target / rel / download overrides for href links', () => {
    const n = renderServiceLink({ icon: 'i', href: '/f.csv', download: '', rel: 'noopener', target: '_self' })
    expect(n.props.download).toBe('')
    expect(n.props.rel).toBe('noopener')
    expect(n.props.target).toBe('_self')
  })

  it('supports in-app navigation (to) and a colour without href props', () => {
    const n = renderServiceLink({ icon: 'mdi-cog', to: '/vm/sub/1', color: 'error', title: 'Configure' })
    expect(n.props.to).toBe('/vm/sub/1')
    expect(n.props.color).toBe('error')
    expect(n.props.href).toBeUndefined()
    expect(n.props.target).toBeUndefined()
  })

  it('supports a pure click handler + disabled (no href, no to)', () => {
    const onClick = () => {}
    const n = renderServiceLink({ icon: 'mdi-account', onClick, disabled: true })
    expect(n.props.onClick).toBe(onClick)
    expect(n.props.disabled).toBe(true)
    expect(n.props.href).toBeUndefined()
  })
})

describe('renderDetailsChip()', () => {
  it('builds a tonal chip with icon + text and a title', () => {
    const n = renderDetailsChip({ icon: 'mdi-jira', text: 'LIGOJ', title: 'Key' })
    expect(n.__v_isVNode).toBe(true)
    expect(n.props.title).toBe('Key')
    expect(n.props.variant).toBe('tonal')
    expect(n.props.size).toBe('small')
    expect(String(n.props.class)).toContain('mr-1')
  })

  it('coerces text to String and honours size / colour overrides', () => {
    const n = renderDetailsChip({ icon: 'i', text: 12, color: 'primary', size: 'x-small' })
    expect(n.props.color).toBe('primary')
    expect(n.props.size).toBe('x-small')
    // default slot renders [icon, ' ', '12']
    const kids = n.children.default()
    expect(kids[kids.length - 1]).toBe('12')
  })
})
