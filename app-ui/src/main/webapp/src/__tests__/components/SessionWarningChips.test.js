import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import SessionWarningChips from '@/components/SessionWarningChips.vue'
import { useI18nStore } from '@/stores/i18n.js'

// Session warnings come from the backend (`userSettings.warnings`, filled by
// the `ISessionSettingsProvider` plug-ins) as `{code, parameters}` and are
// shown in the app bar as warning chips, localized with `warning.<code>`.
function render(warnings) {
  const vuetify = createVuetify({ components, directives })
  return mount(SessionWarningChips, {
    props: { warnings },
    global: { plugins: [vuetify], stubs: { 'v-tooltip': { template: '<span class="tip"><slot /></span>' } } },
  })
}

describe('<SessionWarningChips />', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useI18nStore().merge({
      'warning.some-risk': 'Risk on {primary}',
      'warning.some-risk.label': 'Risky',
    }, 'en')
  })

  it('renders nothing without warning', () => {
    expect(render([]).findAll('.session-warning').length).toBe(0)
    expect(render(null).findAll('.session-warning').length).toBe(0)
  })

  it('one chip per warning, localized label and tooltip with parameters', () => {
    const w = render([{ code: 'some-risk', parameters: { primary: 'service:id:ldap:any' } }])
    const chips = w.findAll('.session-warning')
    expect(chips.length).toBe(1)
    expect(chips[0].text()).toContain('Risky')
    expect(w.find('.tip').text()).toBe('Risk on service:id:ldap:any')
  })

  it('unknown code: generic label and the raw code with its parameters', () => {
    const w = render([{ code: 'other-risk', parameters: { a: 'b' } }])
    expect(w.find('.session-warning').text()).toContain('Warning')
    expect(w.find('.tip').text()).toBe('other-risk (a: b)')
  })

  it('emits select with the clicked warning', async () => {
    const warning = { code: 'some-risk', parameters: {} }
    const w = render([warning])
    await w.find('.session-warning').trigger('click')
    expect(w.emitted('select')[0][0]).toEqual(warning)
  })
})
