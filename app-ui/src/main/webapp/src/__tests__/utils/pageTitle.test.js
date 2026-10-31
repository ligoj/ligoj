import { describe, expect, it } from 'vitest'
import { pageTitleKey } from '@/utils/pageTitle.js'
import en from '@/i18n/en.js'
import fr from '@/i18n/fr.js'

describe('pageTitleKey', () => {
  it.each([
    ['/', 'nav.home'],
    ['/unknown', 'nav.home'],
    ['/profile', 'nav.profile'],
    ['/id/user', 'nav.users'],
    ['/id/group/1', 'nav.groups'],
    ['/id/company', 'nav.companies'],
    ['/id/delegate', 'nav.delegates'],
    ['/id/scope', 'nav.scopes'],
    ['/project/1', 'nav.projects'],
    ['/system/plugin', 'nav.plugins'],
    ['/system/node', 'nav.nodes'],
    ['/system/configuration', 'nav.configuration'],
    ['/system/hook', 'nav.hooks'],
    ['/system/role', 'nav.roles'],
    ['/system/user', 'nav.systemUsers'],
    ['/system/cache', 'nav.cache'],
    ['/system/bench', 'nav.bench'],
    ['/system/task', 'nav.tasks'],
    ['/system/information', 'nav.information'],
    ['/system', 'nav.system'],
    ['/api/token', 'nav.apiTokens'],
    ['/api', 'nav.api'],
    ['/about', 'nav.about'],
  ])('%s is titled by %s, in both languages', (path, key) => {
    expect(pageTitleKey(path)).toBe(key)
    expect(en[key]).toBeTruthy()
    expect(fr[key]).toBeTruthy()
  })

  it('has the shell texts in both languages', () => {
    for (const key of ['nav.soon', 'nav.comingSoon', 'nav.refresh', 'nav.logout', 'common.guest']) {
      expect(en[key]).toBeTruthy()
      expect(fr[key]).toBeTruthy()
    }
  })
})
