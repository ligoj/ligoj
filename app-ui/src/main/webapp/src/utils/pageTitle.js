/**
 * I18n key of the title of a page without breadcrumbs, from its route path. The most specific paths come first.
 */
const TITLES = [
  ['/id/group', 'nav.groups'],
  ['/id/company', 'nav.companies'],
  ['/id/delegate', 'nav.delegates'],
  ['/id/scope', 'nav.scopes'],
  ['/id', 'nav.users'],
  ['/project', 'nav.projects'],
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
]

/**
 * @param {string} path The route path.
 * @returns {string} The i18n key of the page title.
 */
export function pageTitleKey(path) {
  if (path === '/profile') return 'nav.profile'
  return TITLES.find(([prefix]) => path.startsWith(prefix))?.[1] || 'nav.home'
}
