import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourceMicroBar from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/views/ResourceMicroBar.vue'

/**
 * Pure rendering — no Vuetify, no i18n. We just need the bar's
 * percentage fill calculation to be right and the label to render.
 */
function mountBar(props) {
  return mount(ResourceMicroBar, { props })
}

describe('<ResourceMicroBar>', () => {
  it('renders the label text', () => {
    const w = mountBar({ value: 4, max: 8, label: '4 vCPU' })
    expect(w.text()).toContain('4 vCPU')
  })

  it('fills to 50% when value is half the max', () => {
    const w = mountBar({ value: 4, max: 8, label: '4', color: '#1976D2' })
    const fill = w.find('.micro-bar-fill')
    expect(fill.attributes('style')).toContain('width: 50%')
    // jsdom normalises hex colours to rgb() at style-render time.
    expect(fill.attributes('style')).toContain('rgb(25, 118, 210)')
  })

  it('clamps to 100% when value exceeds max', () => {
    const w = mountBar({ value: 12, max: 8, label: 'overflow' })
    expect(w.find('.micro-bar-fill').attributes('style')).toContain('width: 100%')
  })

  it('clamps to 0% for a negative value', () => {
    const w = mountBar({ value: -5, max: 8, label: '-5' })
    expect(w.find('.micro-bar-fill').attributes('style')).toContain('width: 0%')
  })

  it('treats a zero max as max=1 so we never divide by zero', () => {
    const w = mountBar({ value: 0, max: 0, label: '' })
    expect(w.find('.micro-bar-fill').attributes('style')).toContain('width: 0%')
  })

  it('handles a null/undefined value as 0%', () => {
    const w = mountBar({ value: null, max: 10, label: '' })
    expect(w.find('.micro-bar-fill').attributes('style')).toContain('width: 0%')
  })

  it('applies the Vuetify-theme fallback colour when none is passed', () => {
    const w = mountBar({ value: 1, max: 1, label: '' })
    expect(w.find('.micro-bar-fill').attributes('style')).toContain('var(--v-theme-primary)')
  })
})
