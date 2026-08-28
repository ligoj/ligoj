import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LjSearch from '@/components/LjSearch.vue'

// Native browser autofill / field-history must never cover the search field:
// same hardening as LigojAutocomplete / LigojSelect (unique token + opt-outs).
describe('<LjSearch /> autofill hardening', () => {
  it('carries a unique, unmatchable name/autocomplete and the password-manager opt-outs', () => {
    setActivePinia(createPinia())
    const a = mount(LjSearch, { global: { stubs: { 'v-icon': true } } }).find('input')
    const b = mount(LjSearch, { global: { stubs: { 'v-icon': true } } }).find('input')
    for (const input of [a, b]) {
      expect(input.attributes('autocomplete')).toBeTruthy()
      expect(input.attributes('autocomplete')).not.toBe('on')
      expect(input.attributes('name')).toBeTruthy()
      expect(input.attributes('data-lpignore')).toBe('true')
      expect(input.attributes('data-1p-ignore')).toBe('true')
      expect(input.attributes('data-form-type')).toBe('other')
    }
    // Unique per instance, so the browser has no history to match
    expect(a.attributes('name')).not.toBe(b.attributes('name'))
  })
})
