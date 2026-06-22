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
  it('renders the tool icon FILE (svg-first) for a 3+ fragment node, ignoring uiClasses', () => {
    // uiClasses is present but must be ignored — the icon file wins for tools.
    const w = renderHost({ id: 'service:scm:git', uiClasses: 'mdi-git' })
    expect(w.find('i').exists()).toBe(false)
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toMatch(/main\/service\/scm\/git\/img\/git\.svg$/)
  })

  it('renders an instance node with its tool icon file', () => {
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

  it('renders an explicit mdi-* uiClasses for a service-level node', () => {
    const w = renderHost({ id: 'service:id', uiClasses: 'mdi-account-group' })
    const i = w.find('i')
    expect(i.classes()).toContain('mdi')
    expect(i.classes()).toContain('mdi-account-group')
    expect(i.classes()).toContain('fa-fw')
  })

  it('maps a legacy fa-* uiClasses to mdi for a service-level node', () => {
    const w = renderHost({ id: 'service:id', uiClasses: 'far fa-id-badge' })
    expect(w.find('i').classes()).toContain('mdi-badge-account-outline')
  })

  it('renders a "$Foo" uiClasses as a text badge (service-level)', () => {
    const w = renderHost({ id: 'service:foo', uiClasses: '$F1' })
    const span = w.find('.icon-text')
    expect(span.exists()).toBe(true)
    expect(span.text()).toBe('F1')
  })

  it('falls back to a wrench for a short id with no uiClasses', () => {
    const w = renderHost({ id: 'service:scm' })
    expect(w.find('i').classes()).toContain('mdi-wrench')
  })

  it('handles a string node (id only) just like an object with that id', () => {
    const w = renderHost('service:scm')
    expect(w.find('i').classes()).toContain('mdi-wrench')
  })
})

describe('<NodeIcon /> component', () => {
  it('renders uiClasses for a service-level node', () => {
    const w = mount(NodeIcon, { props: { node: { id: 'service:id', uiClasses: 'mdi-account' } } })
    expect(w.find('i').classes()).toContain('mdi-account')
  })

  it('reacts to prop changes', async () => {
    const w = mount(NodeIcon, { props: { node: { id: 'service:scm', uiClasses: '' } } })
    expect(w.find('i').classes()).toContain('mdi-wrench')
    await w.setProps({ node: { id: 'service:bt:jira:i1', uiClasses: 'mdi-jira' } })
    // Tool/instance nodes render the icon FILE now, not the uiClasses font.
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toMatch(/main\/service\/bt\/jira\/img\/jira\.svg$/)
  })
})
