import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { serializeRegistration, credentialErrorName } from '../utils/webauthn.js'

function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
}

describe('passkey registration payload', () => {
  it('carries the transports only when the API advertised the support, none when unsupported', () => {
    const buffer = new Uint8Array([1, 2]).buffer
    const withTransports = { id: 'abc', response: { clientDataJSON: buffer, attestationObject: buffer, getTransports: () => ['internal', 'hybrid'] } }
    expect(serializeRegistration(withTransports, true).transports).toEqual(['internal', 'hybrid'])
    // An API without the field rejects unknown properties: never sent unless advertised
    expect(serializeRegistration(withTransports)).not.toHaveProperty('transports')
    expect(serializeRegistration(withTransports, false)).not.toHaveProperty('transports')
    const without = { id: 'abc', response: { clientDataJSON: buffer, attestationObject: buffer } }
    expect(serializeRegistration(without, true).transports).toEqual([])
  })
})

describe('credential error name', () => {
  it('names a browser error, empty when nothing usable', () => {
    expect(credentialErrorName(new DOMException('denied', 'NotAllowedError'))).toBe('NotAllowedError')
    expect(credentialErrorName(new DOMException('exists', 'InvalidStateError'))).toBe('InvalidStateError')
    expect(credentialErrorName({ name: 'SecurityError' })).toBe('SecurityError')
    expect(credentialErrorName('boom')).toBe('boom')
    expect(credentialErrorName(null)).toBe('')
    expect(credentialErrorName(undefined)).toBe('')
  })
})

describe('MfaApp — passkey failure in the browser', () => {
  beforeEach(() => {
    window.PublicKeyCredential = function PublicKeyCredential() {}
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { get: vi.fn().mockRejectedValue(new DOMException('The operation is not allowed', 'NotAllowedError')) },
    })
    globalThis.fetch = vi.fn((url) => String(url).endsWith('login/mfa/passkey')
      ? jsonResponse({ challenge: 'AAAA', rpId: 'localhost', allowCredentials: [{ type: 'public-key', id: 'AAAA', transports: ['hybrid'] }] })
      : jsonResponse({ pending: true, devices: [{ id: 52, name: 'mbp', type: 'PASSKEY', defaultDevice: true }] }))
  })

  it('names the browser error and logs it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { default: MfaApp } = await import('../MfaApp.vue')
    const w = mount(MfaApp)
    await flushPromises()
    expect(w.vm.selected?.type).toBe('PASSKEY')
    await w.vm.usePasskey()
    await flushPromises()
    expect(w.vm.error).toContain('The passkey could not be verified')
    expect(w.vm.error).toContain('NotAllowedError')
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls.at(-1))).toContain('NotAllowedError')
    // No assertion was sent: only the two GET calls
    expect(globalThis.fetch.mock.calls.map((c) => String(c[0]))).toEqual(['login/mfa', 'login/mfa/passkey'])
    warn.mockRestore()
  })
})
