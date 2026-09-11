/*
 * WebAuthn (passkeys) browser helpers, shared by the profile (registration) and
 * the MFA page (assertion). The API talks Base64url strings; the browser API
 * wants ArrayBuffers: these functions convert both ways.
 */

/** @returns {boolean} Whether the browser supports WebAuthn. */
export function isWebAuthnSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials
}

/** Base64url (no padding) → ArrayBuffer */
export function fromBase64Url(value) {
  const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** ArrayBuffer → Base64url (no padding) */
export function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Creation options from the API (`POST rest/system/mfa/passkey/setup`) to the
 * `navigator.credentials.create({ publicKey })` argument.
 */
export function toCreationOptions(options) {
  return {
    ...options,
    challenge: fromBase64Url(options.challenge),
    user: { ...options.user, id: fromBase64Url(options.user.id) },
    excludeCredentials: (options.excludeCredentials || []).map((c) => ({ ...c, id: fromBase64Url(c.id) })),
  }
}

/**
 * Request options from the API (`passkey/challenge`) to the
 * `navigator.credentials.get({ publicKey })` argument.
 */
export function toRequestOptions(options) {
  return {
    ...options,
    challenge: fromBase64Url(options.challenge),
    allowCredentials: (options.allowCredentials || []).map((c) => ({ ...c, id: fromBase64Url(c.id) })),
  }
}

/**
 * A created credential to the API registration payload (name added by the
 * caller). The transports the authenticator reports (`internal`, `hybrid`,
 * `usb`...) are added on request: returned with the verification challenge,
 * they let the browser pick the right prompt instead of offering a local
 * authenticator for a credential living elsewhere.
 */
export function serializeRegistration(credential, includeTransports = false) {
  const response = credential.response
  const payload = {
    id: credential.id,
    clientDataJSON: toBase64Url(response.clientDataJSON),
    attestationObject: toBase64Url(response.attestationObject),
  }
  if (includeTransports) {
    // Only when the API advertised the field (`transportsHint` in the setup
    // options): an older API rejects unknown properties.
    const transports = typeof response.getTransports === 'function' ? response.getTransports() : []
    payload.transports = Array.isArray(transports) ? transports : []
  }
  return payload
}

/** An assertion credential to the API verification payload. */
export function serializeAssertion(credential) {
  return {
    id: credential.id,
    clientDataJSON: toBase64Url(credential.response.clientDataJSON),
    authenticatorData: toBase64Url(credential.response.authenticatorData),
    signature: toBase64Url(credential.response.signature),
  }
}

/**
 * The name of a failed `navigator.credentials` call (`NotAllowedError`,
 * `InvalidStateError`, `SecurityError`...), the only clue about what the
 * browser or the authenticator refused; empty when nothing usable.
 */
export function credentialErrorName(e) {
  if (!e) return ''
  if (typeof e === 'string') return e
  return e.name ? String(e.name) : ''
}
