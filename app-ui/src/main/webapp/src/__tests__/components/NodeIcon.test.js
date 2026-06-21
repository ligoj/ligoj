import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nodeIcon } from '@/components/NodeIcon.vue'
import NodeIcon from '@/components/NodeIcon.vue'

/**
 * The helper returns VNode shapes; for assertions we mount it inside a
 * tiny render-function host so we can inspect the rendered DOM.
 */
function renderHost(node) {
  return mount({
    props: { n: { type: [Object, String], default: null } },
    render() { return nodeIcon(this.n) },
  }, { props: { n: node } })
}

describe('nodeIcon()', () => {
  it('renders an explicit mdi-* uiClasses with the mdi font prefix', () => {
    const w = renderHost({ id: 'service:scm:git', uiClasses: 'mdi-git' })
    const i = w.find('i')
    expect(i.exists()).toBe(true)
    expect(i.classes()).toContain('mdi')
    expect(i.classes()).toContain('mdi-git')
    expect(i.classes()).toContain('fa-fw')
  })

  it('renders the legacy `fa-*` token verbatim (caller owns FA loading)', () => {
    const w = renderHost({ id: 'service:bt:jira:s1', uiClasses: 'fab fa-jira' })
    // The FA→MDI map covers this one — `fab fa-jira` → mdi-jira.
    const i = w.find('i')
    expect(i.classes()).toContain('mdi-jira')
  })

  it('falls back to a wrench when id has fewer than 3 fragments and no uiClasses', () => {
    const w = renderHost({ id: 'service:scm' })
    const i = w.find('i')
    expect(i.classes()).toContain('mdi-wrench')
  })

  it('renders an <img> at the main/service/.../img/{tool}.svg path (svg first)', () => {
    const w = renderHost({ id: 'service:scm:git:server-1' })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toMatch(/main\/service\/scm\/git\/img\/git\.svg$/)
  })

  it('falls back to the legacy .png on svg load error, then marks broken', async () => {
    const w = renderHost({ id: 'service:scm:git:server-1' })
    const img = w.find('img')
    await img.trigger('error') // svg missing → swap to .png
    expect(img.attributes('src')).toMatch(/main\/service\/scm\/git\/img\/git\.png$/)
    await img.trigger('error') // png missing too → broken
    expect(img.classes()).toContain('broken')
  })

  it('renders a "$Foo" uiClasses as a text badge', () => {
    const w = renderHost({ id: 'service:foo', uiClasses: '$F1' })
    const span = w.find('.icon-text')
    expect(span.exists()).toBe(true)
    expect(span.text()).toBe('F1')
  })

  it('handles a string node (id only) just like an object with that id', () => {
    const w = renderHost('service:scm')
    expect(w.find('i').classes()).toContain('mdi-wrench')
  })
})

describe('<NodeIcon /> component', () => {
  it('exposes the helper as the default-export component', () => {
    const w = mount(NodeIcon, { props: { node: { id: 'service:scm:git', uiClasses: 'mdi-git' } } })
    expect(w.find('i').classes()).toContain('mdi-git')
  })

  it('reacts to prop changes', async () => {
    const w = mount(NodeIcon, { props: { node: { id: 'service:scm', uiClasses: '' } } })
    expect(w.find('i').classes()).toContain('mdi-wrench')
    await w.setProps({ node: { id: 'service:bt:jira:i1', uiClasses: 'mdi-jira' } })
    expect(w.find('i').classes()).toContain('mdi-jira')
  })
})
