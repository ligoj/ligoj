/*
 * User visual identifier — ONE rule for every user rendering (plugin-id user
 * tables and dialogs, plugin-ui project team leaders, audit trails, the
 * top-right username fallback).
 *
 * `service:id:visual-id-name` (forwarded in the session application data)
 * names the attribute shown as the user's identifier: `id` (the login, by
 * default), `mail` (the first mail), any plain attribute (`firstName`,
 * `lastName`, `company`...), or `customAttributes.<property>`. A user missing
 * the attribute is shown by its login, so nothing is ever blank.
 */
import { useAuthStore } from '@/stores/auth.js'

export const VISUAL_ID_NAME_KEY = 'service:id:visual-id-name'

/** Plain attributes accepted as visual identifier; anything else must be `customAttributes.<x>`. */
const PLAIN_ATTRIBUTES = new Set(['id', 'firstName', 'lastName', 'mail'])

/**
 * The configured attribute name, `id` when unset or unaccepted.
 *
 * @param {Record<string, string>|null|undefined} data The session `applicationSettings.data`; read from the auth store by default.
 */
export function visualIdName(data) {
  const settings = data ?? useAuthStore().appSettings?.data
  const name = String(settings?.[VISUAL_ID_NAME_KEY] || 'id')
  return (PLAIN_ATTRIBUTES.has(name) || name.startsWith('customAttributes.')) ? name : 'id'
}

/**
 * Resolve the visual identifier of a user for a given attribute name (pure).
 *
 * @param {string} name The attribute name (see `visualIdName`).
 * @param {object|string|null} user The user (`id`, `firstName`, `lastName`, `mails`, `customAttributes`...) or its login.
 * @returns {string} The identifier, the login when the attribute is missing, '' without user.
 */
export function resolveVisualId(name, user) {
  if (!user) return ''
  if (typeof user === 'string') return user
  const id = user.id || user.login || ''
  let value
  if (name === 'mail') value = (Array.isArray(user.mails) ? user.mails : []).find(Boolean)
  else if (name.startsWith('customAttributes.')) value = user.customAttributes?.[name.substring('customAttributes.'.length)]
  else value = user[name]
  return (typeof value === 'string' && value.trim()) || id
}

/**
 * The visual identifier of a user, per the current session configuration.
 *
 * @param {object|string|null} user The user or its login.
 */
export function userVisualId(user) {
  return resolveVisualId(visualIdName(), user)
}

/**
 * "First Last" of a user, '' when unknown.
 *
 * @param {object|string|null} user The user or its login.
 */
export function userFullName(user) {
  if (!user || typeof user !== 'object') return ''
  return [user.firstName, user.lastName].filter(Boolean).join(' ')
}

/**
 * Compact label: the visual identifier, followed by the full name when it adds information.
 *
 * @param {object|string|null} user The user or its login.
 * @param {string} [separator] Between the identifier and the name, ' — ' by default.
 */
export function userLabel(user, separator = ' — ') {
  const visual = userVisualId(user)
  const full = userFullName(user)
  return full && full !== visual ? `${visual}${separator}${full}` : visual
}
