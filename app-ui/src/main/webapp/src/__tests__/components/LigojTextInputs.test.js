import { describe, it, expect, afterEach, vi } from 'vitest'
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
    // Unique per instance and randomized per page load: browser form history is keyed on it
    expect(el.attributes('name')).toMatch(new RegExp(`^${prefix}[a-z0-9]+-\\d+$`))
    expect(mountHost(Comp).find(tag).attributes('name')).not.toBe(el.attributes('name'))
    // Password-manager opt-outs
    expect(el.attributes('data-1p-ignore')).toBe('true')
    expect(el.attributes('data-lpignore')).toBe('true')
    expect(el.attributes('data-form-type')).toBe('other')
    expect(el.attributes('data-bwignore')).toBe('true')
  })

  describe('a password with the suppressed autofill', () => {
    afterEach(() => { vi.unstubAllGlobals() })

    // A `type="password"` input makes the form a credential form: the browser offers its saved logins on the field
    // before it and suggests a password, whatever the autocomplete tokens. The value is masked by CSS instead.
    it('is a masked text input, so the browser sees no credential form', () => {
      vi.stubGlobal('CSS', { supports: (property, value) => property === '-webkit-text-security' && value === 'disc' })
      const w = mountHost(LigojTextField, { type: 'password' })
      const input = w.find('input')
      expect(input.attributes('type')).toBe('text')
      expect(w.find('.lj-masked').exists()).toBe(true)
      // A typed secret is never sent to a spelling service, nor corrected
      expect(input.attributes('spellcheck')).toBe('false')
      expect(input.attributes('autocapitalize')).toBe('off')
      expect(input.attributes('autocorrect')).toBe('off')
      expect(input.attributes('autocomplete')).toBe('new-password')
    })

    it('cannot be copied, like a password input', () => {
      vi.stubGlobal('CSS', { supports: () => true })
      const input = mountHost(LigojTextField, { type: 'password' }).find('input').element
      for (const type of ['copy', 'cut']) {
        const event = new Event(type, { cancelable: true })
        input.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
      }
      const text = mountHost(LigojTextField).find('input').element
      const event = new Event('copy', { cancelable: true })
      text.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    })

    it('stays a password input when the browser cannot mask a text', () => {
      vi.stubGlobal('CSS', { supports: () => false })
      const w = mountHost(LigojTextField, { type: 'password' })
      expect(w.find('input').attributes('type')).toBe('password')
      expect(w.find('.lj-masked').exists()).toBe(false)
    })

    it('stays a password input for a login or a password change, which want the password manager', () => {
      vi.stubGlobal('CSS', { supports: () => true })
      for (const autocomplete of ['current-password', 'new-password']) {
        const w = mountHost(LigojTextField, { type: 'password', autocomplete })
        expect(w.find('input').attributes('type')).toBe('password')
        expect(w.find('input').attributes('autocomplete')).toBe(autocomplete)
      }
    })
  })

  it('honors an explicit name and an explicit autocomplete token', () => {
    const w = mountHost(LigojTextField, { name: 'given', autocomplete: 'one-time-code' })
    const el = w.find('input')
    expect(el.attributes('name')).toBe('given')
    expect(el.attributes('autocomplete')).toBe('one-time-code')
  })
})
