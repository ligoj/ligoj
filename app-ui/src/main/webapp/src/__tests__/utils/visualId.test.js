import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'
import { visualIdName, resolveVisualId, userVisualId, userFullName, userLabel } from '@/utils/visualId.js'

const USER = { id: 'fdaugan', firstName: 'Fabrice', lastName: 'Daugan', mails: ['fabrice.daugan@sample.com'], customAttributes: { employeeId: 'E-42' } }
function setConfig(data) { useAuthStore().session = { applicationSettings: { data } } }

describe('visual identifier helper', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('reads the configured attribute, defaulting to the login when unset or unaccepted', () => {
    setConfig({})
    expect(visualIdName()).toBe('id')
    setConfig({ 'service:id:visual-id-name': 'mail' })
    expect(visualIdName()).toBe('mail')
    setConfig({ 'service:id:visual-id-name': 'customAttributes.employeeId' })
    expect(visualIdName()).toBe('customAttributes.employeeId')
    setConfig({ 'service:id:visual-id-name': 'dn' })
    expect(visualIdName()).toBe('id')
    expect(visualIdName({ 'service:id:visual-id-name': 'lastName' })).toBe('lastName')
  })

  it('resolves each mode with a login fallback, never blank', () => {
    expect(resolveVisualId('id', USER)).toBe('fdaugan')
    expect(resolveVisualId('mail', USER)).toBe('fabrice.daugan@sample.com')
    expect(resolveVisualId('firstName', USER)).toBe('Fabrice')
    expect(resolveVisualId('customAttributes.employeeId', USER)).toBe('E-42')
    expect(resolveVisualId('customAttributes.missing', USER)).toBe('fdaugan')
    expect(resolveVisualId('mail', { id: 'nomail', mails: [] })).toBe('nomail')
    expect(resolveVisualId('mail', { id: 'x', mails: 'oops' })).toBe('x')
    expect(resolveVisualId('id', 'raw-login')).toBe('raw-login')
    expect(resolveVisualId('id', { login: 'sys' })).toBe('sys')
    expect(resolveVisualId('id', null)).toBe('')
  })

  it('applies the session configuration and builds the compact label', () => {
    setConfig({ 'service:id:visual-id-name': 'customAttributes.employeeId' })
    expect(userVisualId(USER)).toBe('E-42')
    expect(userFullName(USER)).toBe('Fabrice Daugan')
    expect(userLabel(USER)).toBe('E-42 — Fabrice Daugan')
    expect(userLabel(USER, ' · ')).toBe('E-42 · Fabrice Daugan')
    expect(userLabel({ id: 'bot' })).toBe('bot')
    expect(userLabel('raw')).toBe('raw')
    expect(userFullName('raw')).toBe('')
    setConfig({ 'service:id:visual-id-name': 'firstName' })
    expect(userLabel({ id: 'solo', firstName: 'Solo' })).toBe('Solo')
  })
})
