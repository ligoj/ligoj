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

  it('drill-down: instance slice click rebuilds segments grouped by OS', async () => {
    const cfg = {
      currency: { unit: '$', rate: 1 },
      instances: [
        { id: 1, name: 'a', cost: 100, os: 'LINUX' },
        { id: 2, name: 'b', cost: 50,  os: 'LINUX' },
        { id: 3, name: 'c', cost: 200, os: 'WINDOWS' },
      ],
      databases: [], containers: [], functions: [], storages: [], supports: [],
    }
    const wrapper = mountWithApp({ config: cfg })
    // One root slice → instance.
    expect(wrapper.findAll('path').length).toBe(1)
    // Drill in.
    wrapper.vm.onSliceClick({ key: 'instance' })
    await wrapper.vm.$nextTick()
    // Now two slices: LINUX (150) and WINDOWS (200).
    const sub = wrapper.vm.activeBreakdown
    expect(sub.map((s) => s.label).sort()).toEqual(['LINUX', 'WINDOWS'])
    const linux = sub.find((s) => s.label === 'LINUX')
    const windows = sub.find((s) => s.label === 'WINDOWS')
    expect(linux.cost).toBe(150)
    expect(windows.cost).toBe(200)
  })

  it('drill-down: database slice groups by engine, function by runtime, storage by type', async () => {
    const cfg = {
      currency: { unit: '$', rate: 1 },
      instances: [], containers: [], supports: [],
      databases: [
        { id: 1, cost: 100, engine: 'POSTGRESQL' },
        { id: 2, cost: 50,  engine: 'MYSQL' },
        { id: 3, cost: 25,  engine: 'POSTGRESQL' },
      ],
      functions: [
        { id: 1, cost: 10, runtime: 'NODEJS_20' },
        { id: 2, cost: 10, runtime: 'PYTHON_3_12' },
      ],
      storages: [
        { id: 1, cost: 5, price: { type: { name: 'gp3' } } },
        { id: 2, cost: 7, price: { type: { name: 'io2' } } },
      ],
    }
    const wrapper = mountWithApp({ config: cfg })

    wrapper.vm.onSliceClick({ key: 'database' })
    await wrapper.vm.$nextTick()
    const dbBuckets = wrapper.vm.subBreakdown.map((s) => [s.label, s.cost]).sort()
    expect(dbBuckets).toEqual([['MYSQL', 50], ['POSTGRESQL', 125]])

    // Reset, drill into function.
    wrapper.vm.drill = null
    await wrapper.vm.$nextTick()
    wrapper.vm.onSliceClick({ key: 'function' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.subBreakdown.map((s) => s.label).sort()).toEqual(['NODEJS_20', 'PYTHON_3_12'])

    // Reset, drill into storage.
    wrapper.vm.drill = null
    await wrapper.vm.$nextTick()
    wrapper.vm.onSliceClick({ key: 'storage' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.subBreakdown.map((s) => s.label).sort()).toEqual(['GP3', 'IO2'])
  })

  it('drill-down: bucketises missing fields under "?"', async () => {
    const cfg = {
      currency: { unit: '$', rate: 1 },
      instances: [
        { id: 1, cost: 50, os: 'LINUX' },
        { id: 2, cost: 25 }, // no OS
      ],
      databases: [], containers: [], functions: [], storages: [], supports: [],
    }
    const wrapper = mountWithApp({ config: cfg })
    wrapper.vm.onSliceClick({ key: 'instance' })
    await wrapper.vm.$nextTick()
    const labels = wrapper.vm.subBreakdown.map((s) => s.label)
    expect(labels).toContain('LINUX')
    expect(labels).toContain('?')
  })

  it('drill-down: clicking a sub-slice returns to the root view', async () => {
    const cfg = {
      currency: { unit: '$', rate: 1 },
      instances: [{ id: 1, cost: 50, os: 'LINUX' }],
      databases: [{ id: 2, cost: 30, engine: 'MYSQL' }],
      containers: [], functions: [], storages: [], supports: [],
    }
    const wrapper = mountWithApp({ config: cfg })
    wrapper.vm.onSliceClick({ key: 'instance' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.drill).toBe('instance')
    // Click any sub-slice — drill resets to null.
    wrapper.vm.onSliceClick({ key: 'instance:LINUX' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.drill).toBeNull()
  })

  it('drill-down: non-drillable slices (support) do not change state', async () => {
    const cfg = {
      currency: { unit: '$', rate: 1 },
      instances: [], databases: [], containers: [], functions: [], storages: [],
      supports: [{ id: 1, cost: 10, level: 'BASIC' }],
    }
    const wrapper = mountWithApp({ config: cfg })
    wrapper.vm.onSliceClick({ key: 'support' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.drill).toBeNull()
  })

  it('drill-down: changing config resets drill state', async () => {
    const cfg = {
      currency: { unit: '$', rate: 1 },
      instances: [{ id: 1, cost: 50, os: 'LINUX' }],
      databases: [], containers: [], functions: [], storages: [], supports: [],
    }
    const wrapper = mountWithApp({ config: cfg })
    wrapper.vm.onSliceClick({ key: 'instance' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.drill).toBe('instance')
    await wrapper.setProps({ config: { ...cfg, instances: [] } })
    expect(wrapper.vm.drill).toBeNull()
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
