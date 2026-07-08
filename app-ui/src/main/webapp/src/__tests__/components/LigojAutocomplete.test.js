import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { h, nextTick } from 'vue'
import LigojAutocomplete from '@/components/LigojAutocomplete.vue'

const vuetify = createVuetify({ components, directives })

function mountAc(props = {}, attrs = {}) {
  return mount(LigojAutocomplete, {
    props,
    attrs: { items: ['alpha', 'beta'], ...attrs },
    global: { plugins: [vuetify] },
  })
}

describe('<LigojAutocomplete />', () => {
  it('renders a v-autocomplete with the browser autofill disabled on the input', () => {
    const w = mountAc()
    const input = w.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('autocomplete')).toBe('off')
    // A unique, non-empty name so the browser has no saved value to match.
    expect(input.attributes('name')).toBeTruthy()
    // Password-manager opt-outs.
    expect(input.attributes('data-1p-ignore')).toBe('true')
    expect(input.attributes('data-lpignore')).toBe('true')
    expect(input.attributes('data-form-type')).toBe('other')
  })

  it('honours an explicit autocomplete token', () => {
    const w = mountAc({ autocomplete: 'one-time-code' })
    expect(w.find('input').attributes('autocomplete')).toBe('one-time-code')
  })

  it('respects a caller-provided name', () => {
    const w = mountAc({}, { name: 'job-field' })
    expect(w.find('input').attributes('name')).toBe('job-field')
  })

  it('gives each instance a distinct generated name', () => {
    const a = mountAc().find('input').attributes('name')
    const b = mountAc().find('input').attributes('name')
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a).not.toBe(b)
  })

  it('forwards v-model + items to the inner v-autocomplete', () => {
    const w = mountAc({}, { modelValue: 'alpha' })
    expect(w.findComponent({ name: 'VAutocomplete' }).exists()).toBe(true)
  })

  // Contract: the #item slot receives the RAW result object, so consumers read
  // its fields directly (item.artifact), never item.raw.* — the latter is
  // undefined and throws, which emptied SystemPluginView's install dropdown.
  it('yields the raw item object to the #item slot (fields read directly)', async () => {
    let received
    const w = mount(LigojAutocomplete, {
      attachTo: document.body,
      props: {},
      attrs: { items: [{ artifact: 'plugin-prov', version: '4.0.1' }], 'item-title': 'artifact', 'item-value': 'artifact', menu: true },
      global: { plugins: [vuetify] },
      slots: { item: (scope) => { received = scope.item; return h('div', 'x') } },
    })
    await nextTick(); await nextTick()
    expect(received).toBeTruthy()
    expect(received.artifact).toBe('plugin-prov')
    expect(received.raw).toBeUndefined()
    w.unmount()
  })
})
