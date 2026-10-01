/*
 * Coded warnings `{code, parameters}` sent by the backend, either in the
 * `X-Ligoj-Warning` response header (see useApi) or in the session
 * (`userSettings.warnings`, see SessionWarningChips). The message is the
 * `warning.<code>` i18n entry (host or plugin bundle) with the parameters as
 * placeholders; a code no bundle knows is shown as `code (k: v, ...)`.
 */

/**
 * Localized message of a coded warning.
 *
 * @param {{code: string, parameters?: Object<string, string>}} warning The coded warning.
 * @param {{t: Function}} i18n The i18n store.
 * @returns {string} The message, never empty when the code is set.
 */
export function codedWarningMessage(warning, i18n) {
  const code = String(warning?.code ?? '')
  const parameters = warning?.parameters && typeof warning.parameters === 'object' ? warning.parameters : {}
  if (!code) return ''
  const key = `warning.${code}`
  const localized = i18n.t(key, parameters)
  if (localized && localized !== key) return localized
  const details = Object.entries(parameters).map(([k, v]) => `${k}: ${v}`).join(', ')
  return details ? `${code} (${details})` : code
}

/**
 * Short label of a coded warning: `warning.<code>.label`, else the generic `common.warning`.
 *
 * @param {{code: string}} warning The coded warning.
 * @param {{t: Function}} i18n The i18n store.
 * @returns {string} The label.
 */
export function codedWarningLabel(warning, i18n) {
  const key = `warning.${warning?.code}.label`
  const label = i18n.t(key)
  return label && label !== key ? label : i18n.t('common.warning')
}
