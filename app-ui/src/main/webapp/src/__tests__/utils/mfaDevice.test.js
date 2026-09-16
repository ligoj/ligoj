import { describe, it, expect } from 'vitest'
import { deviceKind, deviceIcon, deviceTransports } from '@/utils/mfaDevice.js'

describe('MFA device kind and icon', () => {
  it('tells a security key, a phone passkey and a built-in authenticator apart', () => {
    expect(deviceKind({ type: 'PASSKEY', transports: ['usb', 'nfc'], attachment: 'cross-platform' })).toBe('securityKey')
    expect(deviceKind({ type: 'PASSKEY', transports: ['nfc'] })).toBe('securityKey')
    expect(deviceKind({ type: 'PASSKEY', transports: ['smart-card'] })).toBe('securityKey')
    expect(deviceKind({ type: 'PASSKEY', attachment: 'cross-platform' })).toBe('securityKey')
    expect(deviceKind({ type: 'PASSKEY', transports: ['hybrid'] })).toBe('phone')
    expect(deviceKind({ type: 'PASSKEY', transports: ['internal'] })).toBe('platform')
    // A synced passkey (iCloud Keychain, Google Password Manager) reports internal + hybrid: built-in
    expect(deviceKind({ type: 'PASSKEY', transports: ['internal', 'hybrid'] })).toBe('platform')
    expect(deviceKind({ type: 'PASSKEY', attachment: 'platform' })).toBe('platform')
  })

  it('falls back to the generic kinds', () => {
    expect(deviceKind({ type: 'PASSKEY' })).toBe('passkey')
    expect(deviceKind({ type: 'PASSKEY', transports: [] })).toBe('passkey')
    expect(deviceKind({ type: 'TOTP' })).toBe('app')
    expect(deviceKind(null)).toBe('app')
  })

  it('maps each kind to an icon and lists the transports', () => {
    expect(deviceIcon({ type: 'TOTP' })).toBe('mdi-cellphone-key')
    expect(deviceIcon({ type: 'PASSKEY', transports: ['usb'] })).toBe('mdi-usb-flash-drive')
    expect(deviceIcon({ type: 'PASSKEY', transports: ['hybrid'] })).toBe('mdi-cellphone-link')
    expect(deviceIcon({ type: 'PASSKEY', transports: ['internal'] })).toBe('mdi-fingerprint')
    expect(deviceIcon({ type: 'PASSKEY' })).toBe('mdi-key-chain-variant')
    expect(deviceTransports({ transports: ['usb', 'nfc', 'bogus'] })).toEqual(['usb', 'nfc'])
    expect(deviceTransports({})).toEqual([])
  })
})
