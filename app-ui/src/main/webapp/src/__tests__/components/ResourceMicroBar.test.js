import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourceMicroBar from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/views/ResourceMicroBar.vue'

/**
 * Pure rendering — no Vuetify, no i18n. We assert the fill percentage, the
 * utilisation colour thresholds, and the "hide the bar at 90%+" rule.
 */
function mountBar(props) {
  return mount(ResourceMicroBar, { props })
}

const fillStyle = (w) => w.find('.micro-bar-fill').attributes('style')

describe('<ResourceMicroBar>', () => {
  it('renders the label text', () => {
    const w = mountBar({ value: 4, max: 8, label: '4 vCPU' })
    expect(w.text()).toContain('4 vCPU')
  })

  it('fills to 50% when value is half the max', () => {
    const w = mountBar({ value: 4, max: 8, label: '4' })
    expect(fillStyle(w)).toContain('width: 50%')
  })

  it('hides the bar at 90% and above (label stays)', () => {
    const at90 = mountBar({ value: 9, max: 10, label: '9' })
    expect(at90.find('.micro-bar-fill').exists()).toBe(false)
    expect(at90.find('.micro-bar-track').exists()).toBe(false)
    expect(at90.text()).toContain('9')

    // value > max also lands in the hidden ≥100% band.
    const over = mountBar({ value: 12, max: 8, label: 'full' })
    expect(over.find('.micro-bar-fill').exists()).toBe(false)
  })

  it('keeps the bar just under 90%', () => {
    const w = mountBar({ value: 89, max: 100, label: '89' })
    expect(w.find('.micro-bar-fill').exists()).toBe(true)
  })

  it('colours by utilisation quality', () => {
    // [80,90) success
    expect(fillStyle(mountBar({ value: 85, max: 100, label: '' }))).toContain('var(--v-theme-success)')
    // [60,80) info
    expect(fillStyle(mountBar({ value: 70, max: 100, label: '' }))).toContain('var(--v-theme-info)')
    // [40,60) warning
    expect(fillStyle(mountBar({ value: 50, max: 100, label: '' }))).toContain('var(--v-theme-warning)')
    // [0,40) error
    expect(fillStyle(mountBar({ value: 20, max: 100, label: '' }))).toContain('var(--v-theme-error)')
  })

  it('applies the boundary colours inclusively at 40 / 60 / 80', () => {
    expect(fillStyle(mountBar({ value: 80, max: 100, label: '' }))).toContain('var(--v-theme-success)')
    expect(fillStyle(mountBar({ value: 60, max: 100, label: '' }))).toContain('var(--v-theme-info)')
    expect(fillStyle(mountBar({ value: 40, max: 100, label: '' }))).toContain('var(--v-theme-warning)')
  })

  it('clamps to 0% (error) for a negative value', () => {
    const w = mountBar({ value: -5, max: 8, label: '-5' })
    expect(fillStyle(w)).toContain('width: 0%')
    expect(fillStyle(w)).toContain('var(--v-theme-error)')
  })

  it('treats a zero max as max=1 so we never divide by zero', () => {
    const w = mountBar({ value: 0, max: 0, label: '' })
    expect(fillStyle(w)).toContain('width: 0%')
  })

  it('handles a null/undefined value as 0%', () => {
    const w = mountBar({ value: null, max: 10, label: '' })
    expect(fillStyle(w)).toContain('width: 0%')
  })

  it('omits the label element when the label is empty (bar-only cell)', () => {
    const w = mountBar({ value: 4, max: 8, label: '' })
    expect(w.find('.micro-bar-label').exists()).toBe(false)
  })

  it('adds the block modifier class when block is set', () => {
    const w = mountBar({ value: 4, max: 8, label: '', block: true })
    expect(w.find('.micro-bar-cell').classes()).toContain('micro-bar-block')
  })
})
