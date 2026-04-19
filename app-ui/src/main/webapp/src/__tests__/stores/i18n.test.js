import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useI18nStore } from '@/stores/i18n.js'

describe('useI18nStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.removeItem('ligoj-locale')
  })

  it('has default locale', () => {
    const store = useI18nStore()
    expect(store.locale).toBeDefined()
    expect(['en', 'fr']).toContain(store.locale)
  })

  it('loads English messages by default', () => {
    const store = useI18nStore()
    // Should have built-in translations loaded
    expect(store.t('nav.home')).toBeDefined()
    expect(store.t('nav.home')).not.toBe('nav.home') // resolved, not raw key
  })

  it('setLocale changes locale to French', () => {
    const store = useI18nStore()
    store.setLocale('fr')
    expect(store.locale).toBe('fr')
    expect(store.t('nav.home')).toBe('Accueil')
    expect(store.t('common.save')).toBe('Enregistrer')
  })

  it('setLocale changes locale to English', () => {
    const store = useI18nStore()
    store.setLocale('en')
    expect(store.locale).toBe('en')
    expect(store.t('nav.home')).toBe('Home')
    expect(store.t('common.save')).toBe('Save')
  })

  it('setLocale falls back to en for unsupported locale', () => {
    const store = useI18nStore()
    store.setLocale('xx')
    expect(store.locale).toBe('en')
  })

  it('t returns key when no translation exists', () => {
    const store = useI18nStore()
    expect(store.t('missing.key')).toBe('missing.key')
  })

  it('merge adds custom messages', () => {
    const store = useI18nStore()
    store.merge({ 'custom.key': 'Custom Value' })
    expect(store.t('custom.key')).toBe('Custom Value')
  })

  it('t supports parameter substitution', () => {
    const store = useI18nStore()
    expect(store.t('dashboard.welcome', { name: 'Jean' })).toBe('Welcome, Jean')
    store.setLocale('fr')
    expect(store.t('dashboard.welcome', { name: 'Jean' })).toBe('Bienvenue, Jean')
  })

  it('persists locale to localStorage', () => {
    const store = useI18nStore()
    store.setLocale('fr')
    expect(localStorage.getItem('ligoj-locale')).toBe('fr')
  })

  it('markLoaded and isLoaded track bundles', () => {
    const store = useI18nStore()
    expect(store.isLoaded('plugin-a')).toBe(false)
    store.markLoaded('plugin-a')
    expect(store.isLoaded('plugin-a')).toBe(true)
  })

  it('exposes SUPPORTED_LOCALES', () => {
    const store = useI18nStore()
    expect(store.SUPPORTED_LOCALES).toContain('en')
    expect(store.SUPPORTED_LOCALES).toContain('fr')
  })
})
