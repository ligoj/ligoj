import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { codedWarningLabel, codedWarningLink, codedWarningMessage } from '@/utils/codedWarning.js'
import { useI18nStore } from '@/stores/i18n.js'
import en from '@/i18n/en.js'

describe('codedWarningLink', () => {
  it('opens the link of the warning', () => {
    expect(codedWarningLink({ code: 'node-credential-expired', link: '/system/node' })).toBe('/system/node')
  })

  it('opens the configuration without an application link', () => {
    for (const link of [undefined, '', 'https://example.org', '//example.org', 42]) {
      expect(codedWarningLink({ code: 'iam-node-no-primary', link })).toBe('/system/configuration')
    }
    expect(codedWarningLink(null)).toBe('/system/configuration')
  })
})

describe('credential expiry warnings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useI18nStore().merge(en, 'en')
    useI18nStore().setLocale('en')
  })

  it('are localized with their parameters', () => {
    const i18n = useI18nStore()
    const expiring = { code: 'node-credential-expiring', parameters: { count: '2', days: '14', node: 'GitLab', date: '2026-11-30' } }
    expect(codedWarningLabel(expiring, i18n)).toBe('Expiring credentials')
    expect(codedWarningMessage(expiring, i18n)).toBe('2 node(s) have credentials expiring within 14 days, such as "GitLab" on 2026-11-30. Replace them in Administration, Nodes.')
    const expired = { code: 'node-credential-expired', parameters: { count: '1', node: 'GitHub' } }
    expect(codedWarningLabel(expired, i18n)).toBe('Expired credentials')
    expect(codedWarningMessage(expired, i18n)).toBe('1 node(s) call their tool with expired credentials, such as "GitHub". Replace them in Administration, Nodes.')
  })
})
