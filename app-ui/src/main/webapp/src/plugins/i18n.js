import { createI18n } from 'vue-i18n'
import en from '@/i18n/en.js'
import fr from '@/i18n/fr.js'

export const SUPPORTED_LOCALES = ['en', 'fr']

/**
 * Legacy bundles and plugin NLS files use Mustache-style `{{name}}` and the
 * literal key `{{{this}}}` for the positional arg. vue-i18n's default syntax
 * is `{name}` / `{0}`. Rather than rewrite hundreds of translation strings,
 * normalize on load:
 *   {{name}}    -> {name}
 *   {{[0]}}     -> {0}
 *   {{{this}}}  -> {_}    (positional placeholder; caller passes `_`)
 */
function normalizeMessage(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/\{\{\{\s*this\s*\}\}\}/g, '{_}')
    .replace(/\{\{\s*\[(\d+)\]\s*\}\}/g, '{$1}')
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, '{$1}')
}

function normalizeMessages(bundle) {
  const out = {}
  for (const [k, v] of Object.entries(bundle)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v)
      ? normalizeMessages(v)
      : normalizeMessage(v)
  }
  return out
}

function detectLocale() {
  const saved = typeof localStorage !== 'undefined'
    ? localStorage.getItem('ligoj-locale')
    : null
  if (SUPPORTED_LOCALES.includes(saved)) return saved
  const browserLang = typeof navigator !== 'undefined'
    ? navigator.language?.substring(0, 2)
    : 'en'
  return SUPPORTED_LOCALES.includes(browserLang) ? browserLang : 'en'
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    en: normalizeMessages(en),
    fr: normalizeMessages(fr),
  },
  // Our translation keys include literal dots (e.g. `nav.home`) so disable
  // vue-i18n's default path-traversal resolver and look up keys verbatim.
  messageResolver: (obj, path) => obj?.[path] ?? null,
  missingWarn: false,
  fallbackWarn: false,
  warnHtmlMessage: false,
})

/**
 * Sets the active locale, syncs localStorage, and returns the applied value.
 * Unknown locales fall back to English.
 */
export function setLocale(loc) {
  const target = SUPPORTED_LOCALES.includes(loc) ? loc : 'en'
  i18n.global.locale.value = target
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ligoj-locale', target)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = target
  }
  return target
}

/**
 * Merges a flat message map into the current locale. Used by the plugin
 * loader after fetching a plugin's NLS bundle via nls-adapter.
 */
export function mergeMessages(messages, locale = i18n.global.locale.value) {
  i18n.global.mergeLocaleMessage(locale, normalizeMessages(messages))
}

export default i18n
