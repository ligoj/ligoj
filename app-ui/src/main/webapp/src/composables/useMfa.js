import { computed, ref } from 'vue'
import { useApi } from '@/composables/useApi.js'

/**
 * Multi-factor authentication of the current user (API `rest/system/mfa`,
 * bootstrap `MfaResource`): registered devices, last authentication, TOTP
 * enrollment and removal. Errors of the enrollment (invalid code, name taken)
 * are returned as codes so the dialog shows them inline; an API without the
 * resource (older bootstrap) is reported as `unavailable` instead of an error.
 */
/** A TOTP code: exactly 6 digits (spaces ignored). */
export const OTP_CODE = /^\d{6}$/

/**
 * @param {string} value The typed code.
 * @returns {boolean} Whether it is a complete 6-digit code.
 */
export function isOtpCode(value) {
  return OTP_CODE.test(String(value || '').replace(/\s/g, ''))
}

/**
 * Keep only the digits of a typed code, at most 6.
 *
 * @param {string} value The typed text.
 * @returns {string}
 */
export function sanitizeOtpCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6)
}

export function useMfa() {
  const api = useApi()
  const status = ref(null)
  const loading = ref(false)
  const unavailable = ref(false)
  const devices = computed(() => status.value?.devices || [])

  async function load() {
    loading.value = true
    try {
      const response = await api.get('rest/system/mfa', { raw: true, silent: true })
      if (response?.ok) {
        status.value = await response.json()
        unavailable.value = false
      } else {
        unavailable.value = response?.status === 404 || response?.status === 405
        if (!unavailable.value) status.value = null
      }
    } finally {
      loading.value = false
    }
  }

  /** @returns {Promise<{secret: string, uri: string, issuer: string, account: string} | null>} */
  function setup() {
    return api.post('rest/system/mfa/totp/setup')
  }

  /**
   * Register a TOTP device.
   * @returns {Promise<{ok: boolean, error?: 'invalid-code'|'already-exist'|'error'}>}
   */
  async function register({ name, secret, code }) {
    const response = await api.post('rest/system/mfa/totp', { name, secret, code }, { raw: true, silent: true })
    if (response?.ok) return { ok: true }
    let error = 'error'
    try {
      const body = await response.json()
      if (body?.errors?.code) error = 'invalid-code'
      else if (body?.errors?.name) error = 'already-exist'
    } catch { /* not a validation payload */ }
    return { ok: false, error }
  }

  async function remove(id) {
    await api.del(`rest/system/mfa/${id}`)
  }

  /** Passkey creation options (challenge, relying party, user, excluded credentials). */
  function setupPasskey() {
    return api.post('rest/system/mfa/passkey/setup')
  }

  /**
   * Register a passkey from the credential created by the browser.
   * @returns {Promise<{ok: boolean, error?: 'already-exist'|'invalid'|'error'}>}
   */
  async function registerPasskey(name, registration) {
    const response = await api.post('rest/system/mfa/passkey', { name, ...registration }, { raw: true, silent: true })
    if (response?.ok) return { ok: true }
    let error = 'error'
    try {
      const body = await response.json()
      if (body?.errors?.name) error = 'already-exist'
      else if (body?.errors?.passkey) error = 'invalid'
    } catch { /* not a validation payload */ }
    return { ok: false, error }
  }

  /** Make a device the default one proposed at verification. */
  async function setDefault(id) {
    await api.put(`rest/system/mfa/${id}/default`)
  }

  return { status, devices, loading, unavailable, load, setup, register, setupPasskey, registerPasskey, setDefault, remove }
}
