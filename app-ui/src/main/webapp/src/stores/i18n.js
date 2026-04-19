import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import en from '@/i18n/en.js'
import fr from '@/i18n/fr.js'

const BUNDLES = { en, fr }
const SUPPORTED_LOCALES = Object.keys(BUNDLES)

export const useI18nStore = defineStore('i18n', () => {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ligoj-locale') : null
  const browserLang = typeof navigator !== 'undefined' ? navigator.language?.substring(0, 2) : 'en'
  const initial = saved || (SUPPORTED_LOCALES.includes(browserLang) ? browserLang : 'en')

  const locale = ref(initial)
  const messages = ref({ ...en, ...(BUNDLES[initial] || {}) })
  const loadedBundles = ref(new Set())

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  const t = computed(() => {
    const msgs = messages.value
    return (key, params) => {
      let val = msgs[key]
      if (val === undefined) return key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), escapeHtml(v))
        })
      }
      return val
    }
  })

  function merge(newMessages) {
    messages.value = { ...messages.value, ...newMessages }
  }

  function setLocale(loc) {
    const target = SUPPORTED_LOCALES.includes(loc) ? loc : 'en'
    locale.value = target
    // Reload messages: start from English base, overlay target locale
    messages.value = { ...en, ...(BUNDLES[target] || {}) }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ligoj-locale', target)
    }
  }

  function markLoaded(bundleId) {
    loadedBundles.value.add(bundleId)
  }

  function isLoaded(bundleId) {
    return loadedBundles.value.has(bundleId)
  }

  return { locale, messages, t, merge, setLocale, markLoaded, isLoaded, SUPPORTED_LOCALES }
})
