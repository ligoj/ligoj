import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { h, nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AdminNavExtras from '@/components/AdminNavExtras.vue'
import registry from '@/plugins/registry.js'

// AdminNavExtras renders Vuetify components (v-divider, v-list-subheader)
// and at runtime lives inside the sidebar's <v-list>. Those components
// only render with a Vuetify instance and a list context, so the tests
// mount it inside `<v-app><v-list>` with Vuetify installed — mirroring
// how the other host component tests (LigojDataTable, …) set up.
function mountInList() {
  const vuetify = createVuetify({ components, directives })
  const Harness = {
    components: { AdminNavExtras },
    template: '<v-app><v-list><AdminNavExtras /></v-list></v-app>',
  }
  return mount(Harness, { global: { plugins: [vuetify] } })
}

// Render plugin entries as plain anchors so the assertions don't depend
// on the entry VNode type — the component's job is to collect and mount
// whatever VNodes the plugin returns, grouped under a per-plugin divider
// + ownership subheader.
function fakeAdminPlugin(id, titles, label) {
  return {
    id,
    label,
    install() {},
    feature: (action) =>
      action === 'renderAdmin'
        ? titles.map((title) => h('a', { class: 'admin-entry' }, title))
        : (() => { throw new Error(`Plugin "${id}" has no feature "${action}"`) })(),
  }
}

describe('AdminNavExtras', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registry.remove('demo-admin')
    registry.remove('demo-admin-2')
    registry.remove('no-admin')
  })
  afterEach(() => {
    registry.remove('demo-admin')
    registry.remove('demo-admin-2')
    registry.remove('no-admin')
  })

  it('renders no plugin entries when none contribute', () => {
    const wrapper = mountInList()
    expect(wrapper.findAll('.admin-entry')).toHaveLength(0)
    expect(wrapper.find('.admin-nav-extras-owner').exists()).toBe(false)
    expect(wrapper.find('.admin-nav-extras-divider').exists()).toBe(false)
  })

  it('renders a divider + the plugin entries when a plugin contributes', () => {
    registry.register('demo-admin', fakeAdminPlugin('demo-admin', ['Catalog', 'Currency'], 'Provisioning'))
    const wrapper = mountInList()
    expect(wrapper.find('.admin-nav-extras-divider').exists()).toBe(true)
    expect(wrapper.text()).toContain('Catalog')
    expect(wrapper.text()).toContain('Currency')
    expect(wrapper.findAll('.admin-entry')).toHaveLength(2)
  })

  it('renders a per-plugin ownership subheader carrying the plugin label', () => {
    registry.register('demo-admin', fakeAdminPlugin('demo-admin', ['Catalog'], 'Provisioning'))
    const wrapper = mountInList()
    const owner = wrapper.find('.admin-nav-extras-owner')
    expect(owner.exists()).toBe(true)
    // Ownership notice = "<label> <suffix>"; the host i18n suffix is "plugin".
    expect(owner.text()).toContain('Provisioning')
  })

  it('groups contributions per plugin (a divider + owner per contributor)', () => {
    registry.register('demo-admin', fakeAdminPlugin('demo-admin', ['Catalog'], 'Provisioning'))
    registry.register('demo-admin-2', fakeAdminPlugin('demo-admin-2', ['Other'], 'Other Plugin'))
    const wrapper = mountInList()
    expect(wrapper.findAll('.admin-nav-extras-divider')).toHaveLength(2)
    expect(wrapper.findAll('.admin-nav-extras-owner')).toHaveLength(2)
    expect(wrapper.findAll('.admin-entry')).toHaveLength(2)
  })

  it('skips plugins that do not implement renderAdmin', () => {
    registry.register('no-admin', {
      id: 'no-admin',
      install() {},
      feature: (action) => { throw new Error(`Plugin "no-admin" has no feature "${action}"`) },
    })
    const wrapper = mountInList()
    expect(wrapper.findAll('.admin-entry')).toHaveLength(0)
    expect(wrapper.find('.admin-nav-extras-owner').exists()).toBe(false)
  })

  it('reacts to a plugin registered after first paint', async () => {
    const wrapper = mountInList()
    expect(wrapper.findAll('.admin-entry')).toHaveLength(0)
    registry.register('demo-admin', fakeAdminPlugin('demo-admin', ['Terraform'], 'Provisioning'))
    await nextTick()
    expect(wrapper.text()).toContain('Terraform')
  })
})
