import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileView from '@/views/ProfileView.vue'
import { PRESET_OPTIONS } from '@/plugins/presets.js'
import { useI18nStore } from '@/stores/i18n.js'

// The theme tiles carry a themed v-tooltip, never the browser's native `title` box: its title is
// the theme name plus a chip telling a light theme (sun) from a dark one (moon).
function render() {
  const vuetify = createVuetify({ components, directives })
  return mount(ProfileView, {
    global: {
      plugins: [vuetify],
      stubs: { 'v-tooltip': { template: '<span class="tip"><slot /></span>' }, RouterLink: true, ApiVerifyDialog: true },
    },
  })
}

describe('ProfileView theme tiles', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // The MFA status the view loads on mount: none here
    globalThis.fetch.mockResolvedValue({ ok: false, status: 404, headers: new Headers(), json: async () => ({}), text: async () => '' })
    useI18nStore().merge({ 'profile.themeLight': 'Light', 'profile.themeDark': 'Dark' }, 'en')
  })

  it('no native title on a tile', () => {
    const swatches = render().findAll('.swatch')
    expect(swatches.length).toBe(PRESET_OPTIONS.length)
    swatches.forEach((s) => expect(s.attributes('title')).toBeUndefined())
  })

  it('tooltip title: theme name and a light or dark chip with its icon, then the description', () => {
    const swatches = render().findAll('.swatch')
    PRESET_OPTIONS.forEach((opt, i) => {
      const tip = swatches[i].find('.tip')
      expect(tip.exists()).toBe(true)
      const title = tip.find('.swatch-tip-title')
      expect(title.text()).toContain(opt.label)
      const chip = title.find('.v-chip')
      expect(chip.text()).toBe(opt.dark ? 'Dark' : 'Light')
      expect(chip.find('.v-icon').classes()).toContain(opt.dark ? 'mdi-weather-night' : 'mdi-white-balance-sunny')
      expect(tip.text()).toContain(opt.description)
    })
  })
})
