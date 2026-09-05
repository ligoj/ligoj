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

/** A created credential to the API registration payload (name added by the caller). */
export function serializeRegistration(credential) {
  return {
    id: credential.id,
    clientDataJSON: toBase64Url(credential.response.clientDataJSON),
    attestationObject: toBase64Url(credential.response.attestationObject),
  }
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
