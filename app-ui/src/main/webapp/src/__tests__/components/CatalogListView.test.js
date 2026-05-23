import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import i18nPlugin, { mergeMessages } from '@/plugins/i18n.js'
import CatalogListView from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/views/CatalogListView.vue'
import enMessages from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/i18n/en.js'

const vuetify = createVuetify({ components, directives })
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }] })

function mountView() {
  return mount(CatalogListView, {
    global: { plugins: [vuetify, i18nPlugin, router] },
    attachTo: document.body,
  })
}

function jsonResponse(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: (k) => (k === 'content-type' ? 'application/json' : null) },
    json: () => Promise.resolve(body),
  })
}

describe('<CatalogListView>', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Plugin-local translations are merged into the host i18n at the
    // plugin's `install()` time. Tests bypass that path, so seed the
    // bundle directly.
    mergeMessages(enMessages, 'en')
  })
  afterEach(() => vi.restoreAllMocks())

  it('loads catalogs on mount and renders one row per provider', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse([
      {
        node: { id: 'service:prov:aws', name: 'AWS' },
        nbQuotes: 4,
        status: { lastSuccess: 1700000000000, nbLocations: 24, nbTypes: 200, nbPrices: 10000, end: 1700000000000 },
      },
      {
        node: { id: 'service:prov:azure', name: 'Azure' },
        nbQuotes: 0,
        status: null,
      },
    ]))
    const wrapper = mountView()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalled()
    const [url] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('rest/service/prov/catalog')
    expect(wrapper.text()).toContain('AWS')
    expect(wrapper.text()).toContain('Azure')
  })

  it('renders the empty-state alert when the API returns []', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse([]))
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toMatch(/No catalogs registered\.|Aucun catalogue/)
  })
})
