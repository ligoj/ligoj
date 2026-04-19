/**
 * NLS Adapter — parses legacy RequireJS i18n bundles.
 *
 * Legacy format (nls/messages.js):
 *   define({ root: { "key": "value", ... }, "fr": true })
 *
 * Locale-specific (nls/fr/messages.js):
 *   define({ "key": "valeur", ... })
 */

function parseDefineBlock(text) {
  const match = text.match(/define\s*\(\s*(\{[\s\S]*\})\s*\)/)
  if (!match) return null
  try {
    // Convert JS object literal to valid JSON:
    // - Quote unquoted keys
    // - Replace single quotes with double quotes
    // - Remove trailing commas before } or ]
    const json = match[1]
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/(\{|,)\s*([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":')
    return JSON.parse(json)
  } catch {
    return null
  }
}

async function fetchText(url) {
  const resp = await fetch(url, { credentials: 'include' })
  if (!resp.ok) return null
  return resp.text()
}

export async function loadNlsMessages(pluginId, locale = 'en') {
  // Plugin NLS bundles are served via the `/main/*` proxy (see loader.js).
  const appBase = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  const base = pluginId
    ? `${appBase}main/${pluginId}/nls`
    : `${appBase}main/nls`

  // Load root bundle
  const rootText = await fetchText(`${base}/messages.js`)
  if (!rootText) return {}

  const rootData = parseDefineBlock(rootText)
  if (!rootData) return {}

  // Extract root messages
  const messages = rootData.root || rootData

  // Check if locale is available and not 'en' (root)
  if (locale && locale !== 'en' && rootData[locale]) {
    const localeText = await fetchText(`${base}/${locale}/messages.js`)
    if (localeText) {
      const localeData = parseDefineBlock(localeText)
      if (localeData) {
        Object.assign(messages, localeData)
      }
    }
  }

  return messages
}
