import { defineStore } from 'pinia'
import { computed } from 'vue'
import i18n, { SUPPORTED_LOCALES, setLocale as setI18nLocale, mergeMessages } from '@/plugins/i18n.js'

/**
 * Thin pinia wrapper around the vue-i18n instance. The store keeps the same
 * API the app and plugins already rely on (`t`, `setLocale`, `merge`,
 * `markLoaded`, `isLoaded`) while delegating lookup, reactivity, and locale
 * management to vue-i18n.
 */
export const useI18nStore = defineStore('i18n', () => {
  const locale = computed({
    get: () => i18n.global.locale.value,
    set: (v) => { setI18nLocale(v) },
  })

  function t(key, params) {
    return params ? i18n.global.t(key, params) : i18n.global.t(key)
  }

  function setLocale(loc) {
    return setI18nLocale(loc)
  }

  function merge(newMessages) {
    mergeMessages(newMessages)
  }

  const loadedBundles = new Set()
  function markLoaded(bundleId) { loadedBundles.add(bundleId) }
  function isLoaded(bundleId) { return loadedBundles.has(bundleId) }

  return { locale, t, merge, setLocale, markLoaded, isLoaded, SUPPORTED_LOCALES }
})
