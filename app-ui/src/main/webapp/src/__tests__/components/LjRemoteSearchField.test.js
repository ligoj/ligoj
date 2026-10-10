/*
 * LjRemoteSearchField: the subscribe-wizard input picking a remote item of the
 * selected tool instance, searched as the user types
 * (`<path>/<instance node>/<criteria>`), and its `remoteSearchField` factory
 * binding a tool's search options for the `parameterField` hook.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { useI18nStore } from '@/stores/i18n.js'
import LjRemoteSearchField from '@/components/LjRemoteSearchField.vue'
import { remoteSearchField } from '@/utils/remoteSearchField.js'

const PARAMETER = { id: 'service:km:confluence:space', type: 'TEXT', mandatory: true }
const NODE = 'service:km:confluence:local'
const SPACES = [
  { id: 'DEMO', name: 'Demo space' },
  { id: 'OPS', name: 'OPS' },
]

function jsonResponse(body) {
  return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body }
}

// Expose the bindings of the field; the test types through `update:search`
const inputStub = (name) => ({
  name,
  props: ['modelValue', 'label', 'items', 'rules', 'loading', 'placeholder', 'hint', 'returnObject'],
  emits: ['update:search', 'update:modelValue'],
  template: '<input class="search" />',
})
const stubs = { LigojAutocomplete: inputStub('LigojAutocomplete'), LigojCombobox: inputStub('LigojCombobox') }

function mountField(props = {}, component = LjRemoteSearchField) {
  return mount(component, {
    props: { path: 'rest/service/km/confluence', parameter: PARAMETER, modelValue: '', instanceNodeId: NODE, formValues: {}, ...props },
    global: { stubs },
  })
}
const input = (w) => w.findComponent({ name: 'LigojAutocomplete' }).exists() ? w.findComponent({ name: 'LigojAutocomplete' }) : w.findComponent({ name: 'LigojCombobox' })
// The search waits for a pause in the typing
async function type(w, criteria) {
  input(w).vm.$emit('update:search', criteria)
  vi.advanceTimersByTime(300)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  setActivePinia(createPinia())
  useI18nStore().merge({ 'wizard.rule.required': 'Required', 'service:km:confluence:space': 'Space', 'service:km:confluence:space-description': 'The space to link', 'common.typeToSearch': 'Type to search…' }, 'en')
  globalThis.fetch = vi.fn(async () => jsonResponse(SPACES))
})
afterEach(() => { vi.useRealTimers() })

describe('LjRemoteSearchField', () => {
  it('searches the items of the selected instance as the user types', async () => {
    const w = mountField()
    await type(w, 'demo')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('rest/service/km/confluence/service%3Akm%3Aconfluence%3Alocal/demo')
    // The name is displayed, the identifier is the stored value and is shown below when it differs
    expect(input(w).props('items')).toEqual([
      { title: 'Demo space', subtitle: 'DEMO', value: 'DEMO' },
      { title: 'OPS', subtitle: null, value: 'OPS' },
    ])
  })

  it('reads the value and the subtitle of an item through the given functions', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse([{ id: 'p:1', key: 'org:app', name: 'App' }]))
    const w = mountField({ toValue: (i) => i.key, toSubtitle: (i) => `key ${i.key}` })
    await type(w, 'app')
    expect(input(w).props('items')).toEqual([{ title: 'App', subtitle: 'key org:app', value: 'org:app' }])
  })

  it('accepts a data table response', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ data: [SPACES[1]] }))
    const w = mountField()
    await type(w, 'ops')
    expect(input(w).props('items').map((i) => i.value)).toEqual(['OPS'])
  })

  it('sends the listed form values as query parameters', async () => {
    const w = mountField({ query: ['service:vm:aws:region', 'service:vm:aws:none'], formValues: { 'service:vm:aws:region': 'eu-west-1', 'service:vm:aws:other': 'x' } })
    await type(w, 'i-1')
    expect(fetch.mock.calls[0][0]).toBe('rest/service/km/confluence/service%3Akm%3Aconfluence%3Alocal/i-1?service%3Avm%3Aaws%3Aregion=eu-west-1')
  })

  it('searches once the user pauses typing', async () => {
    const w = mountField()
    for (const criteria of ['d', 'de', 'dem', 'demo']) {
      input(w).vm.$emit('update:search', criteria)
      vi.advanceTimersByTime(100)
    }
    await flushPromises()
    expect(fetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(fetch.mock.calls.map((c) => c[0])).toEqual(['rest/service/km/confluence/service%3Akm%3Aconfluence%3Alocal/demo'])
  })

  it('does not query without a criteria or without an instance', async () => {
    let w = mountField()
    await type(w, '  ')
    w = mountField({ instanceNodeId: null })
    await type(w, 'demo')
    expect(fetch).not.toHaveBeenCalled()
    expect(input(w).props('items')).toEqual([])
  })

  it('keeps the results of the latest search only', async () => {
    const pending = []
    globalThis.fetch = vi.fn(() => new Promise((resolve) => pending.push(resolve)))
    const w = mountField()
    await type(w, 'd')
    await type(w, 'demo')
    pending[1](jsonResponse([SPACES[0]]))
    await flushPromises()
    pending[0](jsonResponse(SPACES))
    await flushPromises()
    expect(input(w).props('items').map((i) => i.value)).toEqual(['DEMO'])
    expect(input(w).props('loading')).toBe(false)
  })

  it('emits the selected value, an empty value when cleared', () => {
    const w = mountField()
    input(w).vm.$emit('update:modelValue', 'DEMO')
    input(w).vm.$emit('update:modelValue', null)
    expect(w.emitted('update:modelValue')).toEqual([['DEMO'], ['']])
  })

  it('picks among the results only, unless a new value is allowed', () => {
    expect(mountField().findComponent({ name: 'LigojCombobox' }).exists()).toBe(false)
    const free = input(mountField({ allowNew: true }))
    expect(free.vm.$options.name).toBe('LigojCombobox')
    // The typed text or the value of the picked item, not the item itself
    expect(free.props('returnObject')).toBe(false)
  })

  it('labels the parameter like the other inputs of the form', () => {
    let field = input(mountField())
    expect(field.props('label')).toBe('Space *')
    expect(field.props('hint')).toBe('The space to link')
    expect(field.props('placeholder')).toBe('Type to search…')
    expect(field.props('rules').map((rule) => rule(''))).toEqual(['Required'])
    expect(field.props('rules').map((rule) => rule('DEMO'))).toEqual([true])
    field = input(mountField({ parameter: { ...PARAMETER, mandatory: false }, placeholder: 'service:km:confluence:space' }))
    expect(field.props('label')).toBe('Space')
    expect(field.props('placeholder')).toBe('Space')
    expect(field.props('rules')).toEqual([])
  })
})

describe('remoteSearchField', () => {
  it('binds the search options of a tool to the field mounted by the wizard', async () => {
    const Field = remoteSearchField({ path: 'rest/service/vm/aws', query: ['service:vm:aws:region'] })
    const update = vi.fn()
    const w = mount(Field, {
      props: { modelValue: '', parameter: PARAMETER, formValues: { 'service:vm:aws:region': 'eu-west-1' }, mode: 'link', isNode: false, nodeId: 'service:vm:aws', instanceNodeId: 'service:vm:aws:local', project: null, 'onUpdate:modelValue': update },
      global: { stubs },
    })
    await type(w, 'i-1')
    expect(fetch.mock.calls[0][0]).toBe('rest/service/vm/aws/service%3Avm%3Aaws%3Alocal/i-1?service%3Avm%3Aaws%3Aregion=eu-west-1')
    input(w).vm.$emit('update:modelValue', 'DEMO')
    expect(update).toHaveBeenCalledWith('DEMO')
  })
})
