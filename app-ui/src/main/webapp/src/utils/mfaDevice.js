/*
 * MFA device presentation — what kind of authenticator a registered device is.
 *
 * A passkey is described by the browser at registration: the `transports` it
 * can use (`usb`, `nfc`, `ble`, `smart-card` for a roaming security key such
 * as a YubiKey; `internal` for the device's own sensor; `hybrid` for a phone
 * reached through the QR flow) and its `attachment` (`platform` or
 * `cross-platform`). The API forwards them on each device, with the
 * authenticator `model` when its AAGUID is a known one.
 */

/** Transports of a roaming (removable) security key. */
const ROAMING = new Set(['usb', 'nfc', 'ble', 'smart-card'])
const KNOWN = new Set(['usb', 'nfc', 'ble', 'smart-card', 'internal', 'hybrid'])

const ICONS = {
  app: 'mdi-cellphone-key',
  securityKey: 'mdi-usb-flash-drive',
  phone: 'mdi-cellphone-link',
  platform: 'mdi-fingerprint',
  passkey: 'mdi-key-chain-variant',
}

/**
 * The known transports of a device, in the reported order.
 *
 * @param {object} device The device.
 * @returns {string[]} The transports.
 */
export function deviceTransports(device) {
  return (Array.isArray(device?.transports) ? device.transports : []).filter((t) => KNOWN.has(t))
}

/**
 * The kind of a device: `app` (TOTP), `securityKey`, `phone`, `platform`, or `passkey` when unknown.
 *
 * @param {object} device The device (`type`, `transports`, `attachment`).
 * @returns {string} The kind, an i18n suffix of `profile.mfaKind.*`.
 */
export function deviceKind(device) {
  if (!device || device.type !== 'PASSKEY') return 'app'
  const transports = deviceTransports(device)
  if (transports.some((t) => ROAMING.has(t)) || device.attachment === 'cross-platform') return 'securityKey'
  if (transports.includes('internal') || device.attachment === 'platform') return 'platform'
  if (transports.includes('hybrid')) return 'phone'
  return 'passkey'
}

/**
 * The icon of a device.
 *
 * @param {object} device The device.
 * @returns {string} An mdi icon name.
 */
export function deviceIcon(device) {
  return ICONS[deviceKind(device)]
}

/**
 * The device shown as default at verification: the flagged one, else the first registered.
 *
 * @param {object[]} devices The registered devices.
 * @returns {object|null} The default device, null without any device.
 */
export function defaultDevice(devices) {
  const list = Array.isArray(devices) ? devices : []
  return list.find((d) => d?.defaultDevice) || list[0] || null
}
