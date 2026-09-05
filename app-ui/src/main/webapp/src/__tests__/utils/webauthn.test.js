import { describe, it, expect } from 'vitest'
import { fromBase64Url, toBase64Url, toCreationOptions, toRequestOptions, serializeRegistration, serializeAssertion } from '../../utils/webauthn.js'

describe('webauthn helpers', () => {
  it('converts base64url both ways', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255])
    const encoded = toBase64Url(bytes.buffer)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(new Uint8Array(fromBase64Url(encoded))).toEqual(bytes)
    expect(new Uint8Array(fromBase64Url('AQI'))).toEqual(new Uint8Array([1, 2]))
  })

  it('maps the API options to the browser API', () => {
    const creation = toCreationOptions({ challenge: 'AQI', rp: { id: 'localhost' }, user: { id: 'AQI', name: 'u' }, excludeCredentials: [{ type: 'public-key', id: 'AQI' }] })
    expect(creation.challenge).toBeInstanceOf(ArrayBuffer)
    expect(creation.user.id).toBeInstanceOf(ArrayBuffer)
    expect(creation.user.name).toBe('u')
    expect(creation.excludeCredentials[0].id).toBeInstanceOf(ArrayBuffer)
    const request = toRequestOptions({ challenge: 'AQI', rpId: 'localhost', allowCredentials: [{ type: 'public-key', id: 'AQI' }] })
    expect(request.challenge).toBeInstanceOf(ArrayBuffer)
    expect(request.allowCredentials[0].type).toBe('public-key')
    expect(toRequestOptions({ challenge: 'AQI' }).allowCredentials).toEqual([])
  })

  it('serializes the browser credentials for the API', () => {
    const buf = new Uint8Array([1, 2]).buffer
    expect(serializeRegistration({ id: 'cred', response: { clientDataJSON: buf, attestationObject: buf } })).toEqual({ id: 'cred', clientDataJSON: 'AQI', attestationObject: 'AQI' })
    expect(serializeAssertion({ id: 'cred', response: { clientDataJSON: buf, authenticatorData: buf, signature: buf } })).toEqual({ id: 'cred', clientDataJSON: 'AQI', authenticatorData: 'AQI', signature: 'AQI' })
  })
})
