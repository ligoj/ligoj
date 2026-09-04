import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LigojSelect from '@/components/LigojSelect.vue'

const vuetify = createVuetify({ components, directives })

function mountSel(props = {}, attrs = {}) {
  return mount(LigojSelect, {
    props,
    attrs: { items: ['alpha', 'beta'], ...attrs },
    global: { plugins: [vuetify] },
  })
}

describe('<LigojSelect />', () => {
  it('renders a v-select with the browser autofill disabled on the input', () => {
    const w = mountSel()
    const input = w.find('input')
    expect(input.exists()).toBe(true)
    // A unique, non-empty name so the browser has no saved value to match.
    expect(input.attributes('name')).toBeTruthy()
    // 'off' resolves to 'new-password': the KNOWN token browsers honor to
    // fully suppress autofill (newer Chrome ignores 'off' AND unknown tokens)
    expect(input.attributes('autocomplete')).toBe('new-password')
    expect(input.attributes('autocomplete')).not.toBe('off')
    // Password-manager opt-outs.
    expect(input.attributes('data-1p-ignore')).toBe('true')
    expect(input.attributes('data-lpignore')).toBe('true')
    expect(input.attributes('data-form-type')).toBe('other')
  })

  it('honours an explicit autocomplete token', () => {
    const w = mountSel({ autocomplete: 'one-time-code' })
    expect(w.find('input').attributes('autocomplete')).toBe('one-time-code')
  })

  it('respects a caller-provided name', () => {
    const w = mountSel({}, { name: 'job-field' })
    expect(w.find('input').attributes('name')).toBe('job-field')
  })

  it('gives each instance a distinct generated name', () => {
    const a = mountSel().find('input').attributes('name')
    const b = mountSel().find('input').attributes('name')
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a).not.toBe(b)
  })

  it('disables the menu transition under reduce-motion', () => {
    document.documentElement.dataset.reduceMotion = 'true'
    try {
      const w = mountSel()
      const inner = w.findComponent({ name: 'VSelect' })
      expect(inner.props('menuProps')).toMatchObject({ transition: false })
    } finally {
      delete document.documentElement.dataset.reduceMotion
    }
  })

  it('forwards v-model + items to the inner v-select', () => {
    const w = mountSel({}, { modelValue: 'alpha' })
    expect(w.findComponent({ name: 'VSelect' }).exists()).toBe(true)
  })
})
