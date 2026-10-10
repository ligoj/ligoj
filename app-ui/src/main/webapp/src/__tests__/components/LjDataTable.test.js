/*
 * LjDataTable header cells: an icon with its tooltip by default, or the content of a `header.<key>` slot, such as a
 * status badge summarizing the column.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { h } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import LjDataTable from '@/components/LjDataTable.vue'

const stubs = {
  'v-icon': { template: '<i class="vicon"><slot /></i>' },
  'v-tooltip': { props: ['text'], template: '<span class="vtip">{{ text }}</span>' },
  'v-menu': true,
  'v-progress-circular': true,
}
const HEADERS = [
  { key: 'status', icon: 'mdi-heart-pulse', tooltip: 'Status', align: 'center', width: '64px' },
  { key: 'name', label: 'Name' },
]

function mountTable(slots = {}) {
  return mount(LjDataTable, {
    props: { headers: HEADERS, items: [{ id: 1, status: 'UP', name: 'A' }], itemsLength: 1, tools: false },
    slots,
    global: { stubs },
  })
}

beforeEach(() => { setActivePinia(createPinia()) })

describe('LjDataTable header cells', () => {
  it('render the icon and its tooltip by default', () => {
    const th = mountTable().findAll('th')[0]
    expect(th.find('.vicon').text()).toBe('mdi-heart-pulse')
    expect(th.find('.vtip').text()).toBe('Status')
  })

  it('render a header.<key> slot instead of the icon, the label and the tooltip', () => {
    const w = mountTable({ 'header.status': (scope) => h('b', { class: 'custom' }, scope.header.key) })
    const [status, name] = w.findAll('th')
    expect(status.find('.custom').text()).toBe('status')
    expect(status.find('.vicon').exists()).toBe(false)
    expect(status.find('.vtip').exists()).toBe(false)
    // The other headers keep their default rendering
    expect(name.text()).toContain('Name')
  })

  it('keep a header without label centered over its cells: the sort arrow stays out of the layout', () => {
    const headers = [{ ...HEADERS[0], sortable: true }, { key: 'type', icon: 'mdi-shape', label: 'Type', align: 'center', sortable: true }]
    const mountWith = (slots) => mount(LjDataTable, { props: { headers, items: [], itemsLength: 0, tools: false }, slots, global: { stubs } })
    // An icon alone, or a slot such as a status badge: the arrow hangs out of the centered content
    expect(mountWith({}).findAll('.th-in')[0].classes()).toContain('solo')
    expect(mountWith({ 'header.status': () => h('b', 'dot') }).findAll('.th-in')[0].classes()).toContain('solo')
    // An icon and a label: the arrow balances the icon, the label stays centered
    expect(mountWith({}).findAll('.th-in')[1].classes()).not.toContain('solo')
  })
})
