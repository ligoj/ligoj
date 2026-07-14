import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CapacityField from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/views/CapacityField.vue'

const vuetify = createVuetify({ components, directives })

function mountField(props = {}) {
  return mount(CapacityField, {
    props: { modelValue: 1, ...props },
    global: { plugins: [vuetify] },
  })
}

describe('<CapacityField>', () => {
  it('renders a number input', () => {
    const w = mountField({ label: 'vCPU' })
    const input = w.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('number')
  })

  it('emits a coerced numeric model value on input', async () => {
    const w = mountField()
    await w.find('input').setValue('5')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([5])
  })

  it('emits null when the field is cleared', async () => {
    const w = mountField({ modelValue: 5 })
    await w.find('input').setValue('')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([null])
  })

  it('shows the utilisation bar once a capacity is provided', () => {
    const w = mountField({ modelValue: 1, kind: 'cpu', provided: 4 })
    expect(w.find('.micro-bar-fill').exists()).toBe(true)
  })

  it('renders no bar when no capacity is provided', () => {
    const w = mountField({ modelValue: 1, kind: 'cpu', provided: 0 })
    expect(w.find('.micro-bar-cell').exists()).toBe(false)
  })
})
