import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createApp } from 'vue'
import { mount } from '@vue/test-utils'
import i18nPlugin from '@/plugins/i18n.js'
import QuoteBreakdown from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/views/QuoteBreakdown.vue'

/**
 * Component test for the donut breakdown. We don't try to assert pixel
 * geometry — the underlying `donutPath` math is already covered in
 * quoteFormatters.test.js. The goal here is to verify the cell-level
 * behaviour:
 *   - empty quote: renders nothing (early return)
 *   - one type: full annulus
 *   - several types: one <path> per non-zero slice, plus a centre label
 *   - mode='co2' switches the metric and the centre label
 */

function mountWithApp(props) {
  // QuoteBreakdown reads vue-i18n through `useI18nStore`, which itself
  // calls into vue-i18n's global. Set up an app that registers the
  // host's i18n plugin so the locale messages resolve.
  const app = createApp({})
  app.use(i18nPlugin)
  return mount(QuoteBreakdown, {
    props,
    global: { plugins: [i18nPlugin] },
  })
}

const SAMPLE_CONFIG = {
  currency: { unit: '$', rate: 1 },
  instances: [{ id: 1, name: 'a', cost: 100, co2: 200 }],
  databases: [{ id: 2, name: 'b', cost: 200, co2: 100 }],
  containers: [],
  functions: [],
  storages: [],
  supports: [],
}

describe('<QuoteBreakdown>', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders nothing for a null or zero-total config', () => {
    // The root <div> is gated by `v-if="total > 0"`, which leaves a
    // single comment placeholder when the condition is false.
    expect(mountWithApp({ config: null }).html()).toBe('<!--v-if-->')
    expect(mountWithApp({
      config: { instances: [], databases: [], containers: [], functions: [], storages: [], supports: [] },
    }).html()).toBe('<!--v-if-->')
  })

  it('renders one <path> per non-zero slice plus the centre labels', () => {
    const wrapper = mountWithApp({ config: SAMPLE_CONFIG })
    const paths = wrapper.findAll('path')
    expect(paths.length).toBe(2)
    expect(wrapper.find('.donut-total-label').exists()).toBe(true)
    expect(wrapper.find('.donut-total-value').exists()).toBe(true)
  })

  it('uses a single full annulus when one type carries 100% of the cost', () => {
    const cfg = {
      currency: { unit: '$', rate: 1 },
      instances: [{ id: 1, cost: 50 }],
      databases: [],
      containers: [],
      functions: [],
      storages: [],
      supports: [],
    }
    const wrapper = mountWithApp({ config: cfg })
    expect(wrapper.findAll('path')).toHaveLength(1)
  })

  it('renders the legend rows with cost text', () => {
    const wrapper = mountWithApp({ config: SAMPLE_CONFIG })
    const rows = wrapper.findAll('.quote-breakdown-legend tr')
    expect(rows.length).toBe(2)
    // Cost column should contain a currency unit.
    expect(wrapper.text()).toMatch(/\$/)
  })

  it('switches metric and total label when mode="co2"', () => {
    const wrapper = mountWithApp({ config: SAMPLE_CONFIG, mode: 'co2' })
    // CO2 numbers don't carry the $ currency.
    const total = wrapper.find('.donut-total-value').text()
    expect(total).not.toContain('$')
    // Numbers in legend should look like "g" or "kg" suffixes.
    expect(wrapper.text()).toMatch(/\b\d+\s*(g|kg)\b/)
  })
})
