import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import LigojCombobox from '@/components/LigojCombobox.vue'

const vuetify = createVuetify({ components, directives })

function mountCb(attrs = {}) {
  return mount(LigojCombobox, { attrs: { items: ['alpha', 'beta'], ...attrs }, global: { plugins: [vuetify] } })
}

describe('<LigojCombobox />', () => {
  it('disables the browser autofill on the input', () => {
    const input = mountCb().find('input')
    expect(input.attributes('autocomplete')).toBe('new-password')
    expect(input.attributes('name')).toBeTruthy()
  })

  it('treats an empty-string model as no selection: nothing to clear, no phantom selected entry', async () => {
    const w = mountCb({ modelValue: '', clearable: true })
    await nextTick()
    expect(w.findComponent({ name: 'VCombobox' }).props('modelValue')).toBeNull()
    expect(w.find('.v-field--dirty').exists()).toBe(false)
    const filled = mountCb({ modelValue: 'alpha', clearable: true })
    await nextTick()
    expect(filled.find('.v-field--dirty').exists()).toBe(true)
  })
})
