import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ApiVerifyDialog from '@/components/ApiVerifyDialog.vue'

const vuetify = createVuetify({ components, directives })

const SPEC = {
  openapi: '3.0.1',
  paths: {
    '/project/{id}': {
      get: { summary: 'Get a project', description: 'Full detail', responses: {} },
      delete: { summary: 'Delete a project', responses: {} },
    },
    '/system/security/role': {
      post: { summary: 'Create a role', responses: {} },
    },
  },
}

// Only GET rest/project/* is granted.
const AUTHS = [{ method: 'GET', pattern: '^rest/project(/.*)?$' }]

const stubs = {
  // Avoid the v-dialog teleport: render slots inline.
  LjDialog: { props: ['modelValue', 'title'], template: '<div class="dlg" :data-title="title"><slot /><slot name="footer" /></div>' },
}

function mountDialog(props = {}) {
  return mount(ApiVerifyDialog, {
    props: { modelValue: true, authorizations: AUTHS, ...props },
    global: { plugins: [vuetify], stubs },
  })
}

describe('<ApiVerifyDialog />', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(SPEC),
    })
  })

  it('loads the spec on open and statuses each operation against the authorizations', async () => {
    const w = mountDialog()
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledWith('rest/openapi.json', expect.anything())
    // 3 operations, only GET /project/{id} allowed → 1 ok, 2 error dots.
    expect(w.findAll('.lj-status--ok').length).toBe(1)
    expect(w.findAll('.lj-status--error').length).toBe(2)
    // Rate: 1/3 → 33%.
    expect(w.find('.verify-rate-label').text()).toContain('33')
  })

  it('appends the audited subject to the title', async () => {
    const w = mountDialog({ subject: 'ROLE_X' })
    await flushPromises()
    expect(w.find('.dlg').attributes('data-title')).toContain('ROLE_X')
  })

  it('admin bypass allows everything', async () => {
    const w = mountDialog({ authorizations: [], admin: true })
    await flushPromises()
    expect(w.findAll('.lj-status--ok').length).toBe(3)
    expect(w.findAll('.lj-status--error').length).toBe(0)
  })

  it('gives an allowed verdict + filters for a matching URL', async () => {
    const w = mountDialog()
    await flushPromises()
    await w.find('.v-text-field input').setValue('https://host/ligoj/rest/project/15')
    await flushPromises()
    const fb = w.find('.verify-feedback')
    expect(fb.classes()).toContain('ok')
    expect(fb.text()).toContain('GET')
    // Template-aware filter: both /project/{id} operations remain.
    expect(w.findAll('.vpath').length).toBe(2)
    expect(w.find('.v-alert').exists()).toBe(false)
  })

  it('flags a denied URL', async () => {
    const w = mountDialog()
    await flushPromises()
    await w.find('.v-text-field input').setValue('rest/system/security/role')
    await flushPromises()
    expect(w.find('.verify-feedback').classes()).toContain('ko')
  })

  it('warns when the URL is allowed but matches no OpenAPI operation', async () => {
    const w = mountDialog()
    await flushPromises()
    // '^rest/project(/.*)?$' allows this URL, but no operation covers it
    // (extra path segments defeat the {id} template match).
    await w.find('.v-text-field input').setValue('rest/project/15/extra/deep')
    await flushPromises()
    expect(w.find('.verify-feedback').classes()).toContain('ok')
    expect(w.findAll('.vpath').length).toBe(0)
    expect(w.find('.v-alert').text()).toBeTruthy()
  })
})
