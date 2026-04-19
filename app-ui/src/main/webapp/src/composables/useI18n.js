import { useI18nStore } from '@/stores/i18n.js'
import { loadNlsMessages } from '@/plugins/nls-adapter.js'

export function useI18n(pluginId) {
  const i18nStore = useI18nStore()

  async function load() {
    const bundleId = pluginId || '_core'
    if (i18nStore.isLoaded(bundleId)) return

    const messages = await loadNlsMessages(pluginId, i18nStore.locale)
    i18nStore.merge(messages)
    i18nStore.markLoaded(bundleId)
  }

  function t(key, params) {
    return i18nStore.t(key, params)
  }

  return { t: i18nStore.t, load }
}
