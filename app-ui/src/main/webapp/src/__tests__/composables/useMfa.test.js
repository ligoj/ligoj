import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMfa, isOtpCode, sanitizeOtpCode } from '../../composables/useMfa.js'

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) }
}

describe('useMfa', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('loads the status, and reports an API without the resource as unavailable', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, { required: true, lastConnection: '2026-09-05T10:00:00Z', devices: [{ id: 1, name: 'Phone', type: 'TOTP' }] }))
    const mfa = useMfa()
    await mfa.load()
    expect(mfa.status.value.required).toBe(true)
    expect(mfa.devices.value).toHaveLength(1)
    expect(mfa.unavailable.value).toBe(false)

    globalThis.fetch = vi.fn().mockResolvedValue(response(404, {}))
    await mfa.load()
    expect(mfa.unavailable.value).toBe(true)
  })

  it('accepts only complete 6-digit codes and keeps the digits of the typed text', () => {
    expect(isOtpCode('123456')).toBe(true)
    expect(isOtpCode(' 123 456 ')).toBe(true)
    expect(isOtpCode('12345')).toBe(false)
    expect(isOtpCode('1234567')).toBe(false)
    expect(isOtpCode('12345a')).toBe(false)
    expect(isOtpCode('')).toBe(false)
    expect(sanitizeOtpCode('12 34-56x7')).toBe('123456')
    expect(sanitizeOtpCode(undefined)).toBe('')
  })

  it('registers a passkey and maps the API errors', async () => {
    const mfa = useMfa()
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, 3))
    expect(await mfa.registerPasskey('macbook', { id: 'c', clientDataJSON: 'x', attestationObject: 'y' })).toEqual({ ok: true })
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({ name: 'macbook', id: 'c', clientDataJSON: 'x', attestationObject: 'y' })
    globalThis.fetch = vi.fn().mockResolvedValue(response(400, { errors: { name: [{ rule: 'already-exist' }] } }))
    expect(await mfa.registerPasskey('macbook', {})).toEqual({ ok: false, error: 'already-exist' })
    globalThis.fetch = vi.fn().mockResolvedValue(response(400, { errors: { passkey: [{ rule: 'invalid-code' }] } }))
    expect(await mfa.registerPasskey('macbook', {})).toEqual({ ok: false, error: 'invalid' })
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, headers: { get: () => null }, text: () => Promise.resolve('') })
    await mfa.setDefault(3)
    expect(globalThis.fetch.mock.calls[0][0]).toContain('rest/system/mfa/3/default')
  })

  it('maps the enrollment validation errors to codes', async () => {
    const mfa = useMfa()
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, 42))
    expect(await mfa.register({ name: 'Phone', secret: 'S', code: '123456' })).toEqual({ ok: true })
    globalThis.fetch = vi.fn().mockResolvedValue(response(400, { errors: { code: [{ rule: 'invalid-code' }] } }))
    expect(await mfa.register({ name: 'Phone', secret: 'S', code: '000000' })).toEqual({ ok: false, error: 'invalid-code' })
    globalThis.fetch = vi.fn().mockResolvedValue(response(400, { errors: { name: [{ rule: 'already-exist' }] } }))
    expect(await mfa.register({ name: 'Phone', secret: 'S', code: '123456' })).toEqual({ ok: false, error: 'already-exist' })
  })
})
