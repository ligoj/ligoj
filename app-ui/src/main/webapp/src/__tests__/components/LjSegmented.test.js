import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LjSegmented from '@/components/LjSegmented.vue'

const vuetify = createVuetify({ components, directives })

function render(options, modelValue = 'a') {
  return mount(LjSegmented, { props: { modelValue, options }, global: { plugins: [vuetify] } })
}

describe('<LjSegmented />', () => {
  it('renders one button per option, the active one flagged, and emits the picked value', async () => {
    const w = render([{ value: 'a', label: 'A' }, { value: 'b', label: 'B', icon: 'mdi-star' }])
    const buttons = w.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].classes()).toContain('on')
    expect(buttons[1].classes()).not.toContain('on')
    expect(buttons[1].find('.v-icon').exists()).toBe(true)
    await buttons[1].trigger('click')
    expect(w.emitted('update:modelValue')).toEqual([['b']])
  })

  it('renders an optional `count` as a chip after the label, including zero, and nothing without it', () => {
    const w = render([
      { value: 'a', label: 'UI', count: 11 },
      { value: 'b', label: 'API', count: 0 },
      { value: 'c', label: 'Plain' },
    ])
    const chips = w.findAll('.seg-count')
    expect(chips.map((c) => c.text())).toEqual(['11', '0'])
    expect(w.findAll('button')[2].find('.seg-count').exists()).toBe(false)
    // The label itself no longer carries the number.
    expect(w.findAll('button')[0].text().replace(/\s+/g, ' ')).toBe('UI 11')
  })
})
