import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import LigojTextField from '../../components/LigojTextField.vue'
import LigojTextarea from '../../components/LigojTextarea.vue'

const vuetify = createVuetify({ components })

function mountHost(Comp, props = {}) {
  return mount(Comp, { props: { label: 'Some label', ...props }, global: { plugins: [vuetify] } })
}

describe('<LigojTextField /> / <LigojTextarea /> — native autofill suppressed', () => {
  it.each([
    ['LigojTextField', LigojTextField, 'input', 'lj-tf-'],
    ['LigojTextarea', LigojTextarea, 'textarea', 'lj-ta-'],
  ])('%s hardens its inner element', (_, Comp, tag, prefix) => {
    const w = mountHost(Comp)
    const el = w.find(tag)
    expect(el.exists()).toBe(true)
    // 'off' resolves to 'new-password': the KNOWN token browsers honor to fully
    // suppress autofill (newer Chrome ignores 'off' AND unknown tokens)
    expect(el.attributes('autocomplete')).toBe('new-password')
    expect(el.attributes('name')).toMatch(new RegExp(`^${prefix}\\d+$`))
    // Password-manager opt-outs
    expect(el.attributes('data-1p-ignore')).toBe('true')
    expect(el.attributes('data-lpignore')).toBe('true')
    expect(el.attributes('data-form-type')).toBe('other')
    expect(el.attributes('data-bwignore')).toBe('true')
  })

  it('honors an explicit name and an explicit autocomplete token', () => {
    const w = mountHost(LigojTextField, { name: 'given', autocomplete: 'one-time-code' })
    const el = w.find('input')
    expect(el.attributes('name')).toBe('given')
    expect(el.attributes('autocomplete')).toBe('one-time-code')
  })
})
