# Ligoj UI — Vue host and plugin architecture

Reference for the Vue UI: how the host shell and the plugin bundles fit together, the contracts between them, and the decisions that must not be re-litigated. Keep it in sync whenever a UI concept is introduced or changed.

# Where to start

1. Read this document; the later sections are denser than the first ones.
2. Read the reference plugins: `ligoj-plugins/plugin-id/ui/src/index.js` (service-level contract), `ligoj-plugins/plugin-id-ldap/ui/src/index.js` (tool-level variant), `ligoj-plugins/plugin-ui/ui/src/views/SubscribeWizardView.vue` (subscription wizard).
3. Read the host surface: `app-ui/src/main/webapp/src/host.js` (public API), `plugins/loader.js` (`loadPlugin`, `pluginIdFromKey`, `requires`, in-flight dedup), `plugins/registry.js` (`register`, `get`, `callFeature`).
4. Run the tests before changing anything: host `cd app-ui/src/main/webapp && npm run test --silent`; plugin `cd ligoj-plugins/plugin-<id>/ui && npm test`.

# Stack and principles

- Vue 3 (`<script setup>`), Vite 8 (rolldown), Pinia, Vuetify 4, vue-i18n with flat keys, Material Design Icons + simpleicons. No Axios: native `fetch` only (`useApi`). No VeeValidate: Vuetify `:rules` are enough.
- Backend is `app-api` (Spring Boot, CXF). `app-ui` is a thin Spring Boot shell serving the SPA and proxying `/rest/*`, `/main/*`, `/manage/*` to the API (`BackendProxyServlet`).
- Entry points: `index.html` (app), `login.html` (light login app, does not load the whole application), `mfa.html` (second factor).
- Every plugin is a standalone Maven project (`ligoj/plugin-<qualified-id>` on GitHub) whose Vue bundle is packaged as a webjar and served dynamically by the API (`WebjarsServlet`), so a plugin is added or removed without rebuilding the host. A plugin is a singleton: loaded at most once.
- `v-dialog` is never `persistent`: ESC closes every dialog, and the close is a Cancel.

# Plugin model

Naming for the repository `plugin-prov-aws`: `qualified-id` = `prov-aws`, `plugin-short-id` = `aws`, parent = `prov` (Maven dependency on `plugin-prov`). A plugin has at most one parent; a plugin with a parent is a `tool`, without parent it is a `service` or a `feature` (a feature has no children).

Node ids: `service:<short-id>` (service), `feature:<short-id>` (feature), `service:<parent>:<tool>` (tool). Users create instances only under tools: `service:<parent>:<tool>:<instance>`. Segment count tells the kind: 2 = service/feature, 3 = tool, 4 = instance (`nodeType` / `isInstance` in the host).

# Host as shell

The host owns only the chrome and the shared component surface. Every domain screen lives in a plugin.

- **Host keeps**: `App.vue` (sidebar assembled by `mergeNav` from `BASE_NAV` + plugin `renderNav` contributions, top bar, breadcrumbs, app-bar items), the login / MFA apps, `ProfileView`, `PluginView`, `ErrorSnackbar`, `GlobalToolsList`, the plugin loader and the components re-exported by `host.js`. The host router registers `/profile` and the catch-all `PluginView` only; all other routes come from `install({ router })` of the plugins (`/about` is registered by plugin-ui).
- **plugin-id owns** the identity screens (`UserListView`, `GroupListView`, `CompanyListView`, `DelegateListView`, `ContainerScopeView`, edit dialogs and panels, `GroupMembers{Dialog,Panel}`) and contributes the **Identity** sidebar menu through `renderNav`.
- **plugin-ui owns** the rest: `HomeView`, `ProjectListView`, `ProjectDetailView`, `System*View`, `Api*View`, `AboutView`, `SubscribeWizardView`, `ProjectEditDialog`, `NodeEditDialog`, `AuditDialog`, the Actuator admin surface, the shared subscriptions display and the demo content.
- **Route scheme**: `/` (dashboard), `/project`, `/project/:id`, `/id/{user,group,company,delegate,scope}`, `/system/{node,plugin,role,user,configuration,cache,bench,information,task}`, `/api`, `/api/token`, `/about`. `/home/*` and `/id/container-scope` remain as Vue Router `alias` entries for old bookmarks (an alias does not add a route).
- **2026 chrome components** (host, re-exported from `host.js`), used everywhere with the `.lj-surface` design-token class: `LjPageHeader` (title, subtitle, breadcrumb chips, `#actions`), `LjButton` (primary / ghost / danger), `LjSearch`, `LjDialog`, `LjSegmented` (tab toggle), `LjStatus` (semantic status chip), `LjAvailabilityField` (text field with a live "already exists" check). `.lj-surface` provides the `--ink / --pill / --radius / --mono / --surface / --card / --border*` variables. Theming axes on `<html>`: `data-style` (shadow / radius / border tokens shared by several presets), `data-preset` (exact preset id, scope CSS on it when two presets sharing a style must diverge), `data-reduce-motion`.
- **Themes**: presets in `plugins/vuetify.js` and `plugins/presets.js`, chosen from `ProfileView`, persisted under localStorage `ligoj-theme`. Global Vuetify tweaks go to `assets/vuetify-overrides.css`, imported once.
- **Configurable base path** (`VITE_BASE`, default `/ligoj/`) must match the backend `server.servlet.context-path`. Everything derives from it: Vite `base`, the dev proxy keys, the import maps of the entry HTML (`%BASE_URL%` placeholders, never a literal `/ligoj/assets/...`), runtime `APP_BASE`. Application code builds URLs from `import.meta.env.BASE_URL` / `APP_BASE`, never from a literal `/ligoj/`. The Docker image is built with the placeholder base `/__ligoj_ctx__/` and substitutes the runtime `CONTEXT_URL` at container start.
- **Build chain**: Vite 8 with rolldown (`output.codeSplitting.groups`, not `manualChunks`), ESLint 9 flat config (`js.configs.recommended` + `flat/essential`, `vue/valid-v-slot` with `allowModifiers` for dotted data-table slots).

## Reference and shipped plugins

| Plugin | Role |
| --- | --- |
| `plugin-id` | "fat" service-level reference: routes, views, dialogs, `renderFeatures` / `renderDetailsKey` / `renderDetailsFeatures`, parent-to-tool delegation, shared id parameter fields |
| `plugin-ui` | shared views and wizards (`SubscribeWizardView`, `NodeEditDialog`, `ProjectDetailView`, system views, actuator) |
| `plugin-id-ldap` | "thin" tool-level reference: i18n + `renderFeatures`, `requires: ['id']`; also the vitest scaffolding template |
| `plugin-prov` | large service-level plugin: catalog / currency / administration pages through `renderNav`; its tools (`-aws`, `-azure`, `-fe`, `-outscale`, `-ovh`) are i18n-only since the parent does not delegate |

Other shipped plugin UIs (each emits to `webjars/<id>/vue/`): `plugin-id-cognito` (i18n + shared group fields + AWS wizard layout), `plugin-vm` (+ `-aws`, `-azure`, `-vcloud`: console link + instance chip; `-google`: chip only), `plugin-bt` (+ `-jira`), `plugin-build` (+ `-jenkins`, `-travis`), `plugin-km` (+ `-confluence`), `plugin-qa` (+ `-sonarqube`, bespoke metric badges), `plugin-mail` (+ `-smtp`, i18n-only), `plugin-storage` (+ `-owncloud`), `plugin-security` (+ `-fortify`), `plugin-scm` (+ `-git`, `-github`), `plugin-registry` (+ `-nexus`), `plugin-cartography` (feature-level `actionExtension` on the quote view). Delegating service parents (vm, bt, build, km, qa, mail, storage, security, scm) share one shape: no routes or component, i18n + `subPluginIdFor` / `delegateToToolPlugin` aliases of the host helpers; each tool's vitest imports the sibling parent's `index.js` to exercise delegation.

**Migration status** (2026-09-05): the legacy jQuery / AMD bundles of every migrated plugin are deleted; under `webjars/` only `<id>/vue/` and the `img/` folders remain (node icons are served from `main/service/<svc>/<tool>/img/<tool>.svg|png`, keep them). Not yet migrated, still shipping only their legacy `webjars/service/<path>/` bundle that the host no longer loads (their parameter labels show as raw ids until a `ui/` exists): `plugin-id-sql`, `plugin-prov-digitalocean`, `plugin-prov-gcp`, `plugin-req`, `plugin-req-squash`, `plugin-scm-svn`. Backend-only, no UI needed: `plugin-iam-node`, `plugin-id-ldap-embedded` (a pre-configured LDAP instance), `plugin-redirect`, `plugin-sso-salt`.

## Plugin loading model

- **Pre-loaded** in `main.js`: `REQUIRED_PLUGINS = ['id', 'ui', 'prov']`, awaited before `app.use(router)` and `mount`, so the routes and the sidebar menus they register exist on first paint.
- **Lazy-loaded** in `App.vue` on session ready: `auth.appSettings.plugins` (backend keys such as `service:id:ldap`) go through `pluginIdFromKey` (strip `service:` / `feature:`, `:` becomes `-`) before `loadAllPlugins`. The loader id regex `^[a-zA-Z0-9][\w-]*$` rejects raw colon keys.
- **Just-in-time** through `loadPlugin(id)`: the parameter dialogs' `ensureToolPluginLoaded(nodeId)` and `PluginFeatures` for an unloaded subscription plugin.
- **`requires: ['<parent-id>']`** on a manifest: the loader awaits the dependencies (in parallel, so keep it a strict tree, mutual requires stall forever) before calling `install()`, so the parent's i18n and registry slot exist first.
- **Concurrency**: in-flight loads are deduplicated in a `Map<id, Promise>`, re-entrant safe.
- The bundle URL `/main/<id>/vue/index.js` carries a `?v=<digest>` token: versioned URLs are long-cached (`Application#pluginCacheFilter`), unversioned ones revalidated. After `mvn install` of a plugin the new bundle is served without restarting the API (in dev, copy `index.js` AND `index.css` into `target/classes`).

# Plugin UI recipe

## 1. Directory layout

```
plugin-<id>/
├── pom.xml
├── src/                        # Maven module
└── ui/
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    └── src/
        ├── index.js            # plugin entry (contract below)
        ├── service.js          # optional: feature dispatcher / helpers
        ├── i18n/{en,fr}.js     # flat keys
        ├── views/*.vue
        └── __tests__/          # vitest (setup.js + contract tests)
```

`vite build` emits into `../src/main/resources/META-INF/resources/webjars/<id>/vue/` so Maven packages the bundle in the plugin jar.

## 2. The plugin contract

`ui/src/index.js` default-exports the manifest read by `plugins/loader.js` and `plugins/registry.js` (`register` silently rejects a manifest without `id` + `install`):

```js
import { useI18nStore } from '@ligoj/host'
import enMessages from './i18n/en.js'
import frMessages from './i18n/fr.js'
import service from './service.js'
import FooView from './views/FooView.vue'

const routes = [{ path: '/<id>/foo', name: '<id>-foo', component: FooView }]
const features = { renderFeatures: service.renderFeatures, /* callable through callFeature(<id>, action, …) */ }

export default {
  id: '<id>',                      // stable, URL-safe
  label: 'My Plugin',
  component: Plugin,               // optional root component
  routes,
  requires: ['<parent-id>'],       // optional, tool-level plugins
  install({ router }) {
    const i18n = useI18nStore()    // merge translations BEFORE any view renders
    i18n.merge(enMessages, 'en')
    i18n.merge(frMessages, 'fr')
    for (const route of routes) router.addRoute(route)
  },
  feature(action, ...args) {
    const fn = features[action]
    if (!fn) throw new Error(`Plugin "<id>" has no feature "${action}"`)
    return fn(...args)
  },
  service,
  meta: { icon: 'mdi-...', color: 'blue-darken-3' },
}
export { service }
```

Also at the top of `index.js`, inject the sibling stylesheet: Vite library mode emits a separate `index.css` and does not inject it on dynamic import. Carry the loader's `?v=` token onto the CSS URL (`new URL()` drops the query):

```js
if (typeof document !== 'undefined') {
  const id = 'ligoj-plugin-<id>-css'
  if (!document.getElementById(id)) {
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    const cssUrl = new URL(/* @vite-ignore */ './index.css', import.meta.url)
    cssUrl.search = new URL(import.meta.url).search
    link.href = cssUrl.href
    document.head.appendChild(link)
  }
}
```

### Tool-level (sub-plugin) variant

A tool plugin (`service:<parent>:<tool>`, e.g. `plugin-id-ldap`) augments its parent: no routes, no component, `requires: ['<parent-id>']`, an i18n bundle with the labels of the parameters it owns (`service:id:ldap:base-dn`), and optional `renderFeatures` / `renderDetailsKey` / `parameterField` / `parameterLayout` hooks. Check the parent's `service.js` first: only delegating parents (vm, bt, build, km, qa, mail, storage, security, scm, id, registry) merge a tool's row VNodes; `prov` does not, its tools are i18n-only. The parent side is two lines:

```js
import { toolPluginId, delegateFeature } from '@ligoj/host'
export const subPluginIdFor = toolPluginId                                   // service:build:jenkins:* → 'build-jenkins'
export const delegateToToolPlugin = (s, action) => delegateFeature(s, action, 'build')
// in renderFeatures(subscription): buttons.push(...delegateToToolPlugin(subscription, 'renderFeatures'))
```

`delegateFeature` returns `[]` on any failure (no sub-plugin, no action, throw); "no feature" errors are swallowed, real ones logged under `[plugin:<label>]`.

## 3. Vite config template

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: {
    lib: { entry: resolve(__dirname, 'src/index.js'), formats: ['es'], fileName: () => 'index.js' },
    rollupOptions: {
      // Shared runtimes come from the host through the import map: one vue / pinia / vuetify instance.
      external: ['vue', 'vue-router', 'pinia', 'vuetify', '@ligoj/host'],
      output: { entryFileNames: 'index.js' },
    },
    outDir: resolve(__dirname, '../src/main/resources/META-INF/resources/webjars/<id>/vue'),
    emptyOutDir: true,
  },
})
```

## 4. Shared host surface (`@ligoj/host`)

Resolved by the import map at runtime, aliased to `host.js` in tests. Treat it as the public API.

- **Composables / stores**: `useApi` (`get / post / put / del` on `rest/*`; returns `null` on any non-2xx and pushes the error toast, never throws; `{ raw: true }` for the `Response`, `{ silent: true }` to skip the toast), `useAuthStore` (session, roles, `isAllowed(uiPath)`, `isAllowedApi(path, method)`, `displayName`, `userSettings`, `globalTools`, `redirectToLogin`, OIDC-aware `logout`), `useAppStore` (`setBreadcrumbs(factory, { refresh })`, title, refresh button, `registerHeaderItem`, `registerNavbarItem`), `useI18nStore` (`t`, `setLocale`, `merge`, `locale`), `useErrorStore` (toast queue), `useClipboard`, `useDataTable` (server-paged table state), `useFormGuard` (unsaved-changes dialog + route guard; a dialog's own close path must check `isConfirmationSkipped()` itself), `useEditExtensions`, `useActionExtensions`, `useDemoMode`.
- **Tables**: `LigojDataTable` / `LigojDataTableServer` (v-data-table + tools menu: CSV export, copy; forward `#header.<key>` / `#item.<key>` slots; header `tooltip` field), `VibrantDataTable` (presentation-only, caller keeps its `useDataTable` and listens to `@update:options`), `RowActionsMenu`, `ImportExportBar`.
- **Dialogs**: `LigojConfirmDialog` / `VibrantConfirmDialog` (same props / slots / events), `LjDialog`, `ApiVerifyDialog` (see "API explorer").
- **Inputs (mandatory)**: `LigojAutocomplete` / `LigojSelect` / `LigojCombobox` / `LigojTextField` / `LigojTextarea`. Never use the bare Vuetify widgets: the twins suppress the browser autofill overlay (`autocomplete="new-password"`, the only token current Chrome honors; a `name` unique per instance AND randomized per page load through `composables/antiAutofill.js`, since browsers key their typed-value history on the field name), add the password-manager opt-outs and honor reduce-motion. The only exception is the login pages' credential inputs (`username` / `current-password`) and the MFA `one-time-code` input.
- **Nodes**: `NodeIcon` / `nodeIcon` (priority `uiClasses` → wrench for short ids → PNG; when both SVG and PNG 404 an inline "?" placeholder, `MISSING_NODE_ICON`), `NodeModeChip`, `nodeType`, `isInstance`, `nodePluginId` (`service:prov:aws` → `'prov'`).
- **Plugin plumbing**: `pluginRegistry` / `callFeature` (throws on a missing plugin; prefer `pluginRegistry.get(id)?.feature?.(...)` for graceful degradation), `loadPlugin` / `pluginIdFromKey`, `toolPluginId` / `delegateFeature`, `PluginFeatures`, `renderServiceLink` / `renderDetailsChip`.
- **Chrome**: `LjPageHeader`, `LjButton`, `LjSearch`, `LjSegmented`, `LjStatus`, `LjAvailabilityField`, `LigojIcon` (compact-mode aware `v-icon`).
- **Vuetify primitives** re-exported for render functions: `VBtn`, `VChip`, `VIcon`, `VTooltip`, `VListItem`, `VDivider` (build VNodes with `h(VBtn, …)` instead of bundling a second Vuetify).
- `APP_BASE`: the host's `BASE_URL`. A plugin's own `import.meta.env.BASE_URL` is `/`, so always use `APP_BASE` for absolute URLs (`fetch`, `<img src>`).

## 5. Translations

Keys live with the plugin (no host churn, version-locked with the views) and are **flat**: the host vue-i18n uses `messageResolver: (obj, path) => obj?.[path]`, no dot or colon traversal, which is what makes `t('service:id:ldap:base-dn')` work.

```js
// ui/src/i18n/en.js
export default { '<id>.title': 'My Feature', '<id>.foo.deleteConfirm': 'Delete {name}?' }
```

Use `const { t } = useI18nStore()`. Keep table `headers` as `computed(() => [...])` so they follow the locale. The host keeps only generic keys (`common.*`, `nav.*`, `dashboard.*`, `error.*`, `profile.*`, `subscription.*`, ...); `common.edit / view / delete` are host keys.

## 6. Parameter form conventions

The parameter dialogs auto-render the form of any node from `/rest/node/<tool-id>/parameter/<MODE>`.

**Wire shape (`ParameterVo`)**: `{ id, type, mandatory, secured, defaultValue, min, max, values }`. `type` is UPPERCASE (`TEXT`, `BOOL`, `SELECT`, `MULTIPLE`, `INTEGER`, `DATE`, `TAGS`), always compare through `typeKind(p)`. No `name`, `description` or `pattern` on the wire: labels and hints come from i18n, the password input is driven by `secured`. `depends` no longer exists: the endpoint returns parameters id-ascending, the dialogs sort by display name and apply the plugin layout.

**i18n contract**: two keys per parameter, `'<parameter-id>'` (label) and `'<parameter-id>-description'` (optional hint shown under the field). Helpers: `paramLabel(p) = t(p.id) ?? p.id` (a missing key shows the raw id), `paramHint(p)`, `tOrNull(key)` (vue-i18n echoes a missing key back, `tOrNull` turns that into `null`). Inherited parameters (`service:id:group` on an LDAP subscription) resolve through the unified store: each owning plugin ships its own keys, a tool ships only the keys of the parameters its CSV declares.

**Custom fields (`parameterField`)**: both dialogs call `resolveParameterField(nodeId, ctx)` (`plugin-ui/ui/src/utils/pluginParams.js`), tool plugin first then parent, with `ctx = { parameter, mode ('link'|'create'), isNode, formValues, nodeId, instanceNodeId }`. Return a component (mounted with `v-model`, `:parameter`, `:form-values`, `:mode`, `:is-node`, `:node-id`, `:instance-node-id`) or `null` for the default input. The shared identity fields (`service:id:parent-group` autocomplete, `service:id:group` composite editor with live `exists` check) live in plugin-id `ui/src/fields/` and are exported on `service.parameterFields`; tools (ldap, cognito) resolve that map at call time with `pluginRegistry.get('id')?.service?.parameterFields` because a tool cannot import a sibling bundle (`requires: ['id']` guarantees the parent is registered; tests must register it first).

**Ordering and groups (`parameterLayout`)**: resolved like `parameterField`, returns `[{ label?, parameters: [id | glob] }]`. Groups render first in declared order; an exact id keeps its position, a glob (`service:id:ldap:groups-*`, only `*` is special) pulls every unused matching parameter in display-name order; a parameter belongs to one group (first match), unmatched ids are skipped silently (a node-only parameter simply vanishes from a subscription form), everything else trails in an unlabeled group. `label` is an i18n key with literal fallback. A parent can order a whole family from `ctx.nodeId` (`plugin-registry` orders `url, user, password, secret, token` for every tool); a tool answering `[]` in node context lets the parent layout apply.

**Lazy bundle**: `ensureToolPluginLoaded(nodeId)` runs at parameter-fetch time and is awaited before `parameters.value` is assigned, because `resolveParameterField` / `resolveParameterLayout` read the registry synchronously on first paint (labels re-render when a late bundle merges, component and layout resolution do not).

## 7. Routing

Routes are added by `install({ router })` with kebab-case names (`<id>-foo`). The catch-all `/:pathMatch(.*)*` falls back to `PluginView`. Detail views are dialogs opened from the list (`UserEditDialog`), not routes, to keep the table state.

## 8. Styles

`<style scoped>` for view-local rules; unscoped `<style>` only for Vuetify teleported DOM (dialog overlays, table cells), namespaced by a unique root class. Scoped CSS applies to the ROOT element of a child component too, so a shared child needs a unique root class (`SubscriptionGroupCard` uses `.subcard`, not `.card`).

## 8b. Data tables and list-view conventions

- **Icon-only headers**: a `#header.<key>` slot rendering an icon + a `v-tooltip` with `column.title`; keep `title` populated so CSV export carries a real column name. Sortable variant uses `getSortIcon` / `toggleSort` from the slot.
- **Row actions**: icon-only `<v-btn icon size="small" variant="text">` with a nested `v-tooltip` (`common.edit`, `common.view`, `common.delete`).
- **Data columns** get a leading header icon; **identifier cells** are icon + `<code>`; **boolean cells** use `mdi-check-circle` (`success`) / `mdi-minus-circle-outline` (`grey-lighten-1`), never `color="disabled"` (not a Vuetify color); **status cells** are a colored icon inside a tooltip.
- The shared `statusHeader({ tooltip, key?, sortable?, exportValue? })` helper (`plugin-ui/ui/src/useUiHelpers.js`) defines the first, icon-only, fixed-width status column used by SystemNodeView, the subscriptions list and SystemPluginView.

## 9. Building and testing

```bash
cd plugin-<id>/ui
npm install && npm run build   # → ../src/main/resources/.../webjars/<id>/vue/
npm run lint && npm test       # eslint + vitest run
```

Integration: run the host dev server (`app-ui/src/main/webapp`, `npm run dev`), which proxies `/ligoj/main/<id>/vue/*` to the backend serving the bundle from the plugin's `target/classes` (copy `index.js` and `index.css` there after a build).

**Plugin-local vitest** (template: `plugin-id-ldap/ui/`): devDependencies `@vue/test-utils`, `jsdom`, `pinia`, `vitest`; in `vite.config.js` add `resolve.alias` `'@ligoj/host' → <host>/src/host.js` and `'@' → <host>/src` (host-side imports only), `resolve.dedupe: ['vue', 'pinia', 'vue-router', 'vuetify']` (CRITICAL: otherwise the test's `setActivePinia` never reaches the stores resolved through `@ligoj/host`), and a `test` block (`environment: 'jsdom'`, `globals`, `setupFiles: ['src/__tests__/setup.js']`, `css: false`, `server.deps.inline: ['vuetify']`). `setup.js` stubs `fetch` and `localStorage` and polyfills `ResizeObserver`, `IntersectionObserver`, `visualViewport` so Vuetify overlays mount under jsdom. Sibling plugins are imported by relative path (`../../../../plugin-id/ui/src/index.js`). Any test calling `install()` needs `setActivePinia(createPinia())` first.

**View-level tests**: activate Pinia, seed the plugin i18n with `useI18nStore().merge(en, 'en')`, mount with `global.plugins = [createVuetify({ components, directives }), router]`, assign `globalThis.fetch = vi.fn(...)` before mounting (`vi.spyOn` does not replace the setup stub reliably). A `v-expand-transition` stub must render its slot or the content disappears.

# Extension points

## Subscription row delegation (`PluginFeatures`)

`<PluginFeatures :subscription="row" action="renderFeatures|renderDetailsKey|renderDetailsFeatures" />` resolves the **service-level** plugin from the node id (`nodePluginId`), lazy-loads it, calls `plugin.feature(action, subscription)` and mounts the returned VNodes (single, array or `null`). Actions: `renderFeatures` (action icons next to the unsubscribe button), `renderDetailsKey` (stable resource chips), `renderDetailsFeatures` (live chips: counts, quotas). A plugin without the action throws from its dispatcher and the host swallows that error; real errors surface in `console.warn`. `subscription.data / status / parameters` only exist after the `rest/subscription/status/refresh?id=…` round-trip (ProjectDetail runs it once upfront, Home lazily per visible row).

Use the host builders instead of hand-rolled VNodes:

```js
import { renderServiceLink, renderDetailsChip, useI18nStore } from '@ligoj/host'
renderFeatures(subscription) {
  const { t } = useI18nStore()
  return [renderServiceLink({ icon: 'mdi-home', href: subscription.parameters['…:url'], title: t('…') })] // also { to }, { onClick }, { disabled }, { download }, { color }
},
renderDetailsKey(subscription) {
  const count = subscription?.data?.members
  return count == null ? null : renderDetailsChip({ icon: 'mdi-account-multiple', text: count, title: t('…'), color: 'primary' }) // also { size }, { variant }
}
```

**Tooltips are implicit**: set a plain `title:` on any returned VNode; `PluginFeatures.promoteTitleToTooltip` (`src/utils/promoteTitleToTooltip.js`) upgrades every `title:` into a themed `v-tooltip`, recursing into plain-element array children (component children are slot functions and are left alone) and rendering a `"\n"`-joined title as one row per line. Never import `VTooltip` for delegated output; explicit `<v-tooltip>` is only for a plugin's own SFC templates.

Parent-to-tool delegation: see the tool-level variant above (`toolPluginId` / `delegateFeature`).

## Sidebar global tools (`renderGlobal`)

`session.userSettings.globalTools` is a list of `{ node: <full NodeVo>, parameters }` produced by `ISessionSettingsProvider#decorate`. `GlobalToolsList` (host) derives the tool plugin from the first three segments (`pluginIdFromKey('service:km:confluence')` → `km-confluence`), lazy-loads it and calls `renderGlobal({ node, parameters })`, which returns a `VListItem` VNode (or an array, or `null`), e.g. `h(VListItem, { prependIcon, href: \`${APP_BASE}rest/${parameters.query}\`, target: '_blank', rel: 'noopener noreferrer', title: node?.name || node?.id })`. The host mounts them in a compact nav list above the About row; a missing plugin or feature renders nothing.

## Sidebar menu contribution (`renderNav`)

Declarative data, not VNodes, so the host can position, merge, localize and auth-filter. plugin-id contributes the whole **Identity** menu; plugin-prov inserts its admin pages into **Administration**. `renderNav()` returns one contribution or an array:

```js
// a top-level menu
{ id: 'identity', labelKey: 'nav.identity', icon: 'mdi-account-group', match: '/id', before: 'nav.projects',
  children: [{ id: 'id-users', labelKey: 'nav.users', icon: 'mdi-account', route: '/id/user', match: '/id/user', auth: 'id/user' }] }
// an insert into an existing menu
{ menu: 'nav.system', children: [
  { id: 'prov-catalog', label: t('catalog.title'), icon: 'mdi-database-search', route: '/prov/catalog', divider: 'Provisioning' },
  { id: 'prov-currency', label: t('currency.title'), icon: 'mdi-cash-multiple', route: '/prov/currency' } ] }
```

Fields: `id` (stable key, anchor and open-state key), `labelKey` (host i18n key, re-localizes reactively) or `label` (already localized), `icon`, `route` / `match` (`match` keeps the entry active on a subtree), `auth` (UI authorization path, default = route without leading `/`; the entry is dropped when denied, admins bypass), `divider` (`string` = labeled separator before the entry, `true` = plain), `before` / `after` (anchor on a sibling's `id`, `labelKey`, `route` or `match`; `before` wins; unresolved anchors append in contribution order). A `{ menu }` insert splices into the target's children; a top-level contribution matching an existing menu augments it instead of duplicating it.

Host plumbing: `src/plugins/nav.js` `mergeNav(baseNav, contributions)` (pure, two passes, unit-tested), `App.vue` `BASE_NAV` = Home / Projects / Administration, `pluginNav` computed reads `registry.version` and `i18n.locale` so late bundles and locale switches re-run the merge. The `nav.*` keys are host vocabulary a plugin may reference through `labelKey`. The older VNode-based `renderAdmin` (Administration-only) is still adapted into a `{ menu: 'nav.system' }` insert but is deprecated; `AdminNavExtras.vue` is unmounted dead code.

## Edit dialogs (`editExtension`)

Resolved by `useEditExtensions(target, defaultApiPath, contextSupplier)` (registry-driven, reactive to lazy loads). A contribution `{ component?, footer?, apiPath?, beforeSave? }`:

- `component` renders below the built-in form with props `{ mode: 'create'|'edit', form, context }`; `form` is the live model, extra keys written into it ride along in the save payload (dialogs reset `form` on every open, so write on mount).
- `footer` renders in the action bar (typically an `LjButton`), same props.
- `apiPath` replaces the REST resource of the save (first contributor wins).
- `beforeSave(payload, ctx)` receives the payload about to be sent (the whole `form` spread, including the extension's keys) and returns the body (sync or async; nothing keeps the input, `false` aborts silently). Hooks chain in registration order. The payload CAN be reshaped, but the target must accept it: the standard APIs reject unknown properties with a 400 `Mapping` error, so extra data goes either into known fields or to the plugin's own endpoint through `apiPath`.

Opt out with `null` (or no feature). Targets: `project` (plugin-ui `ProjectEditDialog`, `rest/project`, ctx `project`), `user` (`rest/service/id/user`, `userId`), `delegate` (`rest/security/delegate`, `delegateId`), `container-scope` (`rest/service/id/container-scope`, `scope`, `type`), `company` (`rest/service/id/company`, `companyId`), `group` (`rest/service/id/group`, `groupId`). Every dialog spreads `form` into its payload, dialog-specific transforms applied after; unit coverage in host `src/__tests__/composables/useEditExtensions.test.js`. Reminder: `useApi` returns `null` on a rejected save, the dialog still closes.

## Toolbar (`actionExtension`)

Resolved by `useActionExtensions(target, contextSupplier)`; a contribution `{ action: Component }` mounted after the built-in toolbar actions with a single `context` prop (`{ target, ...viewContext }`). `LjPageHeader` mounts them itself (`actions-target` + `actions-context`); bespoke toolbars call the composable and render `actions` with `<component :is>`. Match the chrome of the target (`LjButton variant="ghost"` in page headers, icon `v-btn` + tooltip in the quote tools strip). Targets: `user`, `group`, `company`, `delegate` (`selected`, `reload()`), `project` (`reload()`), `prov-quote` (`subscriptionId`, `config`, `meta`, `providerNode`, `reload()`). plugin-cartography is the real-world consumer: a `prov-quote` button opening a fullscreen force-directed map of the quote resources (Chart.js bundled in the plugin, pure graph derivation in `ui/src/graph.js`, advanced filtering, table report, JSON export). Tests: host `useActionExtensions.test.js`, `LjPageHeader.test.js`.

## App-bar items

`app.registerNavbarItem(Component)` renders visible compact chrome in the app bar (right-side stack, before the demo chip); `app.registerHeaderItem(Component)` only keeps a root-mounted component alive (dialogs). plugin-ui contributes `PluginUpdatesIndicator` (administrators, when the last check found newer plug-in versions: `mdi-update` picto, count badge, tooltip listing them, opens the plug-in manager).

# Host and plugin-ui features

## Subscription wizard and node editor

`SubscribeWizardView` (mode `subscribe`, dialog in `ProjectDetailView`: Service → Tool → Instance → Mode → Params, `POST rest/subscription`) and `NodeEditDialog` (`create-node`: Service → Tool → new instance form + Mode + Params, `POST rest/node`; `edit-node`: read-only chain + name + params, `PUT rest/node`) share one parameter-form core (`utils/pluginParams.js`, `utils/parameterGroups.js`). The parent field of `NodeEditionVo` is `node`, not `refined` (no `setRefined`, Jackson drops it).

## Shared subscriptions display (`SubscriptionsPanel`)

Used by `ProjectDetailView` and `HomeView` (plugin-ui `components/`):

- `SubscriptionsPanel.vue`: toolbar (cards / list toggle, optional search, collapse-all) over a grid of `SubscriptionGroupCard` or a flat `VibrantDataTable`. Props `groups`, `defaultView`, `searchable`, `collapsible`, `loading`, `cog`; emits `rowmenu`, `row-appear`; slots `#toolbar`, `#empty`.
- `SubscriptionGroupCard.vue`: one tool group (root class `.subcard`), controlled collapse, per-tool search: a magnify button expands an `LjSearch` (Escape closes and clears) filtering rows case-insensitively on name, pills, the node chain (instance / tool / service names and ids) and every non-secured parameter value (`utils/subscriptionSearch.js`, secured = id looks like a secret); the badge shows `matching/total`.
- `SubscriptionStatus.vue`: the status dot used everywhere a node or subscription status is shown, accepting a full `subscription` or a bare `node` (+ `status`). Its tooltip gathers service / tool / instance from the node chain, status, mode, `enabled`, audit and parameters (secrets masked), plus the floating `#<id>` badge. `enabled === false` renders black regardless of status; service / tool / feature nodes show no dot unless disabled. Click re-checks live (`POST rest/node/status/refresh/{id}` for a node, `GET rest/subscription/status/{id}/refresh` for a subscription), the dot blinks while in flight, the result is shallow-merged.
- Group model: `{ key, name, kind, color, icon: () => h(NodeIcon, { node }), health, rows: [{ name, status: 'ok|warn|err|idle', pills, cost?, sub }] }`; `pills` is empty for real subscriptions.
- **ProjectDetailView** builds groups from `rest/project/:id` plus one upfront status refresh, default view `list`. **HomeView** builds them from `rest/subscription` (LIGHT model `{ nodes[], projects[], subscriptions[{ id, project, node: <id> }] }`): rebuild the instance → tool → service chain from `nodes[]` (`refined` = parent id); details are fetched lazily, each row emits `row-appear` (`directives/appear.js`, an IntersectionObserver firing once, immediately under jsdom; a `v-show` hidden row never fires) → batched, chunked `rest/subscription/status/refresh?id=…` → reactive `detailsById`.

## System views (plugin-ui)

- **Plugin manager** (`SystemPluginView`): the "Enabled" switch (`pluginToggle.js`) calls `PUT rest/system/plugin/{artifact}/disable|enable`, which renames the jar (`*.jar.disabled`) so the plug-in class loader skips or loads it at the next restart, like install / uninstall (configuration kept; there is no persisted `enabled` on nodes, `PUT rest/node` rejects it). `LigojPluginVo` carries `disabled` and `loaded`; `pluginState()` derives active / disabled / disabling / enabling (restart required) / pending / deleted, each with its tooltip. Three KPI cards (`pluginStats.js`) with stacked multi-color bars and per-segment tooltips, no legend: plug-ins by type, active plug-ins, verified plug-ins. The **Automation** dialog (`PluginAutomationDialog`, `rest/system/plugin/schedule`, app-api `PluginScheduleResource` with its own scheduler) drives `ligoj.plugin.check` + `.check.cron` (scheduled version check, Spring cron edited with `@vue-js-cron/vuetify`, format `spring`, numeric weekdays), `ligoj.plugin.update` (automatic download, only while the check is enabled, guarded by the risks warning dialog) and `ligoj.plugin.maintenance` + `.maintenance.cron` (restart only when an update is staged). The check result (`ligoj.plugin.check.last/.updates`) is decorated into the session as `plugin-updates`; "Check versions" runs `POST …/schedule/check` and refreshes the session.
- **Tasks** (`SystemTaskView`, `LjSegmented` tabs, deep link `?tab=scheduled`): long-task runners and the scheduled tasks from `GET rest/system/schedule` (app-api `ScheduledTaskResource`: Spring `@Scheduled` methods from the `ScheduledTaskHolder` beans with trigger, next and last execution and outcome, plus `ScheduledTaskProvider` contributions such as the plugin check and maintenance jobs).
- **Actuator admin surface**: routes `/system/information/actuator/:endpoint` (`ActuatorView`, default `info`; `/system/actuator` and `/system/logs` redirect). Two actuators: the API one is reached through `${APP_BASE}manage/*` (proxied to app-api, HAL `_links` come back under the backend context so `toPath()` keeps the segment after `/manage/`), app-ui's own MUST use base path `/actuator` (`/ligoj/actuator/*`, dev proxy needed) because `/manage` is the proxy servlet. The view lists the HAL index with a renderer per endpoint (`components/actuator/registry.js` → `Act*.vue`, props `data`, `copy`, `fetch`, `post`), raw-JSON toggle, download, copy; templated endpoints are filtered out, `heapdump` is a download panel, write endpoints (`restart`, `refresh`, `pause`, `resume`, `shutdown`) get a submit panel with confirmation, `logfile` opens `LogPanel` (API and UI tabs, `Range: bytes=-262144` tail, full-log toggle, filter, wrap, auto-refresh, download; the UI tab is probed on mount). `ActLoggers` edits levels at runtime (`POST loggers/<name>`) and shows the `logging.level.<name>=<LEVEL>` line to persist.

## Displayed username and visual identifier

- `service:id:user-display` (plugin-id session decoration ships `userDetails` and this value raw through `UserOrgResource#getDisplayConfiguration`, because Spring's `Environment` would fail on the `${}` placeholders): the host resolves `auth.displayName` as `id` (default), `mail`, `mail-short`, any attribute including custom ones, or an expression mixing `${token}` placeholders with text. Whenever a mode or token cannot be resolved, the display falls back to the visual identifier; it never throws. The user button tooltip is the identity card (name, login, mails, custom attributes, roles).
- `service:id:visual-id-name` / `-label`: the attribute shown as the user identifier in tables (`id`, `firstName`, `lastName`, `mail`, `customAttributes.<x>`) with an optional static header label; resolved by plugin-id `ui/src/visualId.js` (always falling back to the login), used by `UserListView` and `GroupMembersPanel` first column, sorted on the `visual-id` key mapped server-side (`getOrderedColumns()`, `CustomAttributeComparator` in LDAP).

## Demo mode

`useDemoMode()` → `{ enabled, stored, setEnabled }`: `stored` is the localStorage `ligoj-demo-mode` flag toggled from `ProfileView` (administrators only), `enabled` = stored AND `auth.isAdmin` (a visual decision, not a security measure). While enabled the app bar shows a "Demo" chip and plugin-ui blends demonstration content: demo tool groups on the dashboard, demo projects (`plugin-ui/ui/src/demo/demoData.js`), a `DemoProjectExtension` body + `DemoProjectAction` footer button in the project dialog (`editExtension` on `project`, overriding `apiPath` to the sink endpoint `rest/system/demo/project`, `DemoProjectResource`, which logs and drops the payload; the `beforeSave` hook turns typed `demoTags` into the `tags` list and opens `DemoSavePreviewDialog` with three panes: built by the dialog, added by the demo section, sent to the demo API), a `DemoProjectListAction` toolbar button (`actionExtension` on `project`) and a "Demo showcase" Administration entry (`DemoShowcaseView`, a gallery of the shared components).

## Multi-factor authentication

- **Bootstrap**: `SystemMfaDevice` (`S_MFA_DEVICE`, per-user unique name, encrypted `secret` of 4000 chars, `lastUsed`, `defaultDevice`), dependency-free `TotpHelper` (RFC 6238), `Cbor` and `WebAuthnHelper` (COSE ES256 / RS256, assertion signature check, attestation statement not verified). `MfaResource` at `rest/system/mfa`: `GET` (devices, `required`, `lastConnection`), `POST login` (records the authentication), `POST totp/setup` / `POST totp` (confirm with a first code), `POST passkey/setup` / `POST passkey` (single-use challenge kept 5 min, origin and rpId checks), `POST passkey/challenge` / `POST passkey/verify` (challenge, origin, rpId, user presence, signature, counter regression), `POST verify` (`{ code, device? }`, TOTP), `PUT {id}/default`, `DELETE {id}` (the oldest remaining device becomes default). Configuration `ligoj.mfa.rp-id` (site host, `localhost` by default, set in production and never changed), `ligoj.mfa.origins`, `ligoj.mfa.issuer`. Granted to `USER` by the app-api authorization seed (`^rest/system/mfa.*`, existing databases need the row added by hand).
- **app-ui** enforces the second factor after form and OIDC logins only (`security.mfa.enabled`, default true): `MfaAuthenticationSuccessHandler` flags the session `ligoj.mfa.pending` and sends the user to `mfa.html` (JSON `redirect` for the AJAX form, real redirect for OIDC), `MfaAuthorizationManager` denies everything but the MFA page, `/login/mfa(/passkey)?`, logout and assets while pending, `MfaVerifyFilter` verifies (5 attempts then the session is invalidated), `MfaAccessDeniedHandler` redirects pending sessions. `MfaClient` calls the API with the trusted user header (`SM_UNIVERSALID`) like the proxy; an API without the resource disables the step. API-token mode (`x-api-key` / `x-api-user` headers, `/login-by-api-key`) and pre-auth header mode never carry the session flag and are not subject to MFA.
- **Host**: `mfa.html` + `MfaApp.vue` (`GET /login/mfa` returns the devices, default preselected, 6-digit `one-time-code` input gating the verify button, "Use my passkey" through `GET /login/mfa/passkey` + `navigator.credentials.get`; `utils/webauthn.js` converts Base64url), `LoginApp` honors the `redirect` of the login payload, `composables/useMfa.js` drives the profile **Authentication** card (provider from the `iam-primary` session data, last authentication, add device as authenticator with QR code (`qrcode` package) or passkey through `navigator.credentials.create`, default badge and "use as default", remove). The Permissions card's UI / API lists are `LjSegmented` tabs.

## API explorer and verification

`#/api?op=<method>|<path>` (lowercase method + raw OpenAPI path, URL-encoded) opens the owning tag group and operation of `ApiHomeView`, scrolled and highlighted. `ApiVerifyDialog` (host; props `authorizations`, `admin`, `subject`) crosses every `rest/openapi.json` operation with a set of `{ method?, pattern }` authorizations, shows the allowed rate and tests a typed URL; used by the profile ("Verify" next to "Manage API keys", own session with admin bypass), the system Roles row action and the system Users row action (union of the roles).

**API permission gating**: hide buttons and menu entries behind `v-if="auth.isAllowedApi(path, method)"`; sidebar entries carry `auth`.

# Decisions and gotchas

## Vite / rolldown

- `manualChunks` is rejected in Vite 8: use `build.rollupOptions.output.codeSplitting.groups` with `priority` + `minSize: 0`; Vue must outrank Vuetify or `vue.js` is never emitted and the import map breaks. `chunkFileNames` keeps stable names for `vue`, `router`, `pinia`, `vuetify`, `host`, which the `index.html` import map depends on. `chunkSizeWarningLimit` is 700 because of `vuetify.js`.

## Dev-server proxies

- Every `/ligoj/*` path the backend must see is proxied in `vite.config.js`. `changeOrigin: false` on `/ligoj/oauth2`, `/ligoj/login/oauth2`, `/ligoj/logout`: Spring builds the OAuth redirect URIs from the inbound `Host` and it must stay `:5173`. Targets are pinned to `http://127.0.0.1:…`, never `localhost` (Node resolves `localhost` to `::1` first, and another process bound on the IPv6 loopback would silently shadow Spring).

## Authentication

- `auth.fetchSession()` uses `redirect: 'manual'`, so Spring's `302 → /oauth2/authorization/<client>` surfaces as `opaqueredirect`; the store sets `needsOAuthRedirect` and `redirectToLogin()` top-level-navigates to the OAuth entry.
- A 401 in `error.js` navigates to `${BASE_URL}` (SPA root), which re-runs the session probe and picks OIDC or local login; the deep route is remembered in `sessionStorage` (`ligoj-return-url`) and consumed once.
- `auth.logout()` is a top-level navigation to `${BASE_URL}logout`, never an XHR, so Spring's OIDC logout chain (Keycloak `end_session_endpoint`) runs.
- `login.html` probes `/rest/session` on mount and bounces to the app on `200` or `opaqueredirect`; the local form renders only on a genuine `401`.

## Vue Router 4

- Returning `false` from `onBeforeRouteLeave` consumes `next`; do not keep it for later. Capture the target route and `router.push(to)` after confirmation (`useFormGuard` is the reference).

## Vue components and breadcrumbs

- Sidebar entries are real links (`href="#/route"`, a section links to its first child) so middle-click and modified clicks open new tabs; only a plain left-click is intercepted (`isPlainLeftClick` guard). Never a bare `@click="router.push(...)"` on a hrefless element.
- Two breadcrumb systems: `LjPageHeader :crumbs` draws the in-page chips, the shell top bar is driven by `useAppStore().setBreadcrumbs(factory, { refresh })`. The store re-runs the factory on locale change only, so re-call it from a `watch` when the page's own selection changes (ActuatorView).
- `registerHeaderItem` mounts stay alive at the root (dialogs); `registerNavbarItem` is visible chrome.

## Vuetify

- Tooltips are always Vuetify `v-tooltip` (`activator="parent"`, nested in the element; rich content in the default slot), never the native `title` box, except the `title:` prop of delegated VNodes which the host promotes.
- `v-row dense` is deprecated: `density="comfortable"`. Vuetify widget i18n (table footers) follows the app locale through `locale.messages` in `plugins/vuetify.js`, synced by `setLocale()`.
- `v-select` / `v-autocomplete` `#item` and `#selection` slots receive `{ item, internalItem, index, props }` where `item` is the raw object (no `item.raw`).
- `:rules="[required]"` inline arrays cause "Maximum recursive updates" inside expand transitions (`v-form` watches `rules` by reference): hoist `const REQUIRED_RULES = [required]`.
- `v-combobox` + computed `:items` + `clearable` inside an expansion panel loops forever: use a `shallowRef`, add `eager` on the panel, or fall back to a text field.
- `v-expansion-panels` model must be initialised with `null`, not `undefined`; use `eager` so inputs mount once outside transitions.
- `color="disabled"` is not a Vuetify color.

## vue-i18n

- Escape a literal `@` as `{'@'}` (linked-message syntax otherwise throws `Invalid linked format` and the whole bundle fails).
- Only `t()` read reactively follows locale changes; derive strings in `computed`.
- A missing key is echoed back, not `null`: use `tOrNull`.
- Dynamically built keys (`t('subscription.status.' + s)`) escape a static scan; grep prefixes before deleting keys.

## Backend interop

- `ParameterType` is UPPERCASE on the wire; normalise with `typeKind(p)`.
- `NodeEditionVo` parent field is `node` (no `setRefined`).
- `UriColonDecodingFilter` (app-api `Application.java`, highest precedence) turns `%3A` back into `:` before CXF matching, because `@Path("{node:service:.+}/…")` regexes see the raw URI. Only `:` is decoded (never `%2F`).
- `rest/subscription` (`findAll`) is a light model: `node` is an id, join against `nodes[]` / `projects[]`; `SubscribedNodeVo` carries `uiClasses` so `NodeIcon` receives the full resolved node.
- Actuator responses are `application/vnd.spring-boot.actuator.v3+json`, not auto-parsed by `useApi`: fetch `{ raw: true }` and `JSON.parse(await resp.text())`. A `Range` request against a missing endpoint returns the HTML error page as `206`, so `LogPanel` sniffs the content type. `env` / `configprops` values are masked unless `management.endpoint.{env,configprops}.show-values=ALWAYS`; ActEnv masks `secret|key|password` UI-side anyway. `logfile` needs `management.endpoint.logfile.external-file` pointing at the Log4j2 rolling file (`${ligoj.home:target}/…-rolling.log`), and Log4j2 must read `${env:LIGOJ_HOME:-${sys:ligoj.home:-target}}` since `${sys:}` ignores environment variables.
- Node operational status is not `NodeVo.enabled` (availability of the plug-in / resource): UP / DOWN is the last `EventType.STATUS` event, populated by `NodeResource#findAll?status=true` through the bulk `EventRepository.findLastEvents` (never per row). Live re-check: `POST node/status/refresh/{id}`, `GET subscription/status/{id}/refresh`; stored value: `GET node/status/{id}`.
- Bootstrap's `ConfigurationResource.get()` resolves Spring `${...}` placeholders and throws on unknown ones; a value meant for the UI (`${firstName} ${lastName}`) must be read raw.
- Standard REST APIs reject unknown properties with a 400 `Mapping` error.

## Forms and autocompletes

- Setting a discriminator field and its dependent value in the same synchronous block races with the watcher: set the type, `await nextTick()`, then the value (`DelegateEditDialog`).
- Server-side autocompletes load their first page on `@update:menu` (dropdown open), not on mount.
- An empty string is a selected value for a select: initialise optional select models with `null` and normalise `api || null`.
- A dialog's initial focus can land on the wrong field: `setTimeout`-focus the first enabled input after open + load (`UserEditDialog.focusFirstField`).
- Only the host `Ligoj*` input wrappers (see §4); the parameter dialogs use them for every typed parameter and show the `-description` hint.

## Local toolchain

On a machine where the zsh `nvm` shim is broken, run the toolchain from a clean bash with an explicit PATH: `/bin/bash --noprofile --norc -c 'export PATH=$HOME/.nvm/versions/node/<ver>/bin:$PATH; cd plugin-<id>/ui; ./node_modules/.bin/eslint . && ./node_modules/.bin/vitest run && ./node_modules/.bin/vite build'`.

# Checklist for a new plugin UI

## Service-level plugin

- [ ] `ui/` with `package.json`, `vite.config.js`, `eslint.config.js`; `ui/src/index.js` exports `{ id, label, install, feature, service, meta, routes }`
- [ ] `install()` registers the routes and merges `i18n/{en,fr}.js` (flat keys, host bundles untouched); the CSS auto-injection snippet is present
- [ ] Added to `REQUIRED_PLUGINS` only if the host sidebar references its routes on first paint; a `renderNav` menu owner must be loaded early too
- [ ] Views use the host tables, dialogs and `Ligoj*` inputs; every CSV-declared parameter id has a label key (+ optional `-description`)
- [ ] vitest scaffolding (aliases, `dedupe`, `test` block, `setup.js`) and a contract test mirroring `plugin-id-ldap.test.js`
- [ ] `npm run lint`, `npm test`, `npm run build`, then `mvn install` of the module; smoke test a route, a locale change, logout and login, page refresh

## Tool-level plugin

- [ ] Same skeleton; `requires: ['<parent-id>']`; `install()` only merges i18n covering this tool's own parameters
- [ ] `service.js` implements the row hooks the parent delegates (`renderFeatures`, `renderDetailsKey`), and `parameterField` / `parameterLayout` when needed
- [ ] Distinct webjar path (`webjars/<parent>-<tool>/vue/`); the contract test asserts `requires` and imports the parent's `index.js` to exercise delegation
