# Introduction

The Spring Boot Application is in @ligoj/app-api.
The goal is to rewrite the UI in VueJS.

This is a modular project with many Maven plugins that can be added dynamically.
All plugins are available in this workspace under `ligoj/plugin-<qualified-id>` repositories (github).

At mmost, there is one parent plugin.
Whe a plugin has a parent, the perent is of type `tool`
When a plugin has no parent, it is of type `service` or `feature`.
A plugin of type `feature` cannot have children.


# Github layout
```
ligoj/plugin-<qualified-id> (github)
├── README.md
├── pom.xml
└── src/
    └── main/
        ├── java/
        │   └── org/
        │       └── ligoj/
        │           └── plugin/
        │               └── <PluginClassName>.java
        └── resources/
            └── META-INF/
                └── resources/
                    └── <plugin-path>/
                        ├── <plugin-short-id>.html
                        ├── <plugin-short-id>.js
                        ├── <plugin-short-id>.css
                        ├── messages.js
                        └── nls/
                            ├── en/
                            │   └── messages.js
                            └── fr/
                                └── messages.js
```

Plugins can be children of a group, so nested plugins are possible.
Naming convention for ample of GitHub repository `plugin-prov-aws`
  - `qualified-id` is `prov-aws`.
  - `plugin-short-id` is `aws`.
  - `plugin-path` is `prov/aws`.
  - `plugin-class` is `org.ligoj.app.plugin.prov.aws.resource.ProvAwsPluginResource`, but the simple Java Class name could be without parent plugin prefix, so `AwsPluginResource`.
  - Parent `qualified-id` of `prov-aws` is `prov`. So the Maven repository `plugin-prov-aws` depends on `plugin-prov`.

Each plugin provides at least on `node`:
- the plugin provided nodes have an `id` having the following form: 
  - `service:<plugin-short-id>` for a service
  - `feature:<plugin-short-id>` for a feature
  - `service:<parent-plugin-short-id>:<plugin-short-id>` for a tool `plugin-short-id` having `parent-plugin-short-id` as parent plugin.
- the user can create instances of the tool nodes. So the instances have an `id` having the following form: 
  - `service:<parent-plugin-short-id>:<plugin-short-id>:<instance-id>`.
  - No instance can be created dirrectly under a service or feature node.
  - If the node `id` contains 4 segments, it is an instance node, and the parent `id` contains 3 segments.
  - If the node `id` contains 3 segments, it is a tool node, and the parent `id` contains 2 segments.
  - If the node `id` contains 2 segments, it is a service node or a service. The first segment is always `service` or `feature`.

# Current design

- Bootstrap CSS + JS
- jQuery
- DataTables.net CSS + JS
- Font Awesome icons
- Select2
- jQuery.sparkline.js
- Handlebars.js
- require.js
- `cascade.js`, a custom MVVM library
- `error.mod.js`, a custom error manager
- `application.mod.js`, a custom application manager
- `security.mod.js`, a custom security manager

The application is plugin aware, so with dynamical resources.

## `cascade.js` focus

This library located in `cascade.js` file handles:
- Convention over configuration routing and injection
- i18n along with handlebars
- Inherited contexts from parent hierarchy
- AMD modules loading with require.js
- Transaction management to prevent UI update of a destroyed context
- Auto change title from i18n configuration of current module

Current behavior:
- User requests URL `#/plugin_path`
- Cascade loads the Cascade module `main` (shared common module with utilities, etc.), then `plugin_path`
- Loading a Cascade module `plugin_path` :
  - Get the ressources :
    - `<plugin_path>/<plugin_short_id>.html` (the view, contains handlebars templates)
    - `<plugin_path>/<plugin_short_id>.js` (the controller)
    - `<plugin_path>/<plugin_short_id>.css` (the styles)
    - `<plugin_path>/nls/messages.js` (always loaded)
    - `<plugin_path>/nls/fr/messages.js` (depends on current locale)
  - Initialize the context
  - Merge view, the locale files, and the context
  - Inject the styles
  - Inject the merged view in the DOM of the current parent
  - Inject the controller script in the DOM of the current parent
  - Execute the `initialize` function if present of this module

The assets of `plugin_path` are not parts of the main application, but are brought by plugins. Each plugin is scoped to a specific path, and contains its own assets : css, js, html, etc.
Each plugin is in its own GitHub repository `ligoj/<plugin-repository-id>`. See `<plugin-repo-id>/src/main/resources/META-INF/resources/` in this workspace for sample.

The plugins are not parts of the main application, they are made available by another Spring Boot application that add to the classpath the resources. That's why the `plugin_path` is important to scope the module assets.

For the unload of a module, the `unload` function is called if present of this module and the DOM is cleaned.

## `error.mod.js` focus

This script handles all errors and exceptions. It displays the correct message in the UI and log the error in the console.

## `security.mod.js` focus

This script is a guard and a DOM protection layer. It checks the security of the current user and prevents access to restricted resources.

# Target design

- VueJS
- Vite
- Pinia
- VeeValidate
- Vuetify 4
- VeeValidateI18n
- Material Design icons and simpleicons.org
- ...


Migrate the current implementation :
- Common module with utilities, routing, main VueJS app etc. in `app-ui/src/main/webapp`
- Migrate modular plugin `plugin-id` in `plugin-id/src/main/resources/META-INF/resources/id`.
- A plugin is singleton, it can be loaded multiple times but only one instance is kept.
- Use `index.html` as main entry point for the new VueJS app
- Use `login.html` as main entry point for the new VueJS login
- Find a way to minimize the code size of the login part. There is no need to load the full application for the login.
- Do not use Axios library, only native fetch API
- Complete Dockerfile to include the npm command for the VueJS application.
- `v-dialog` should not be persistent by default.
- Document the new implementation for plugins :
  - how to migrate them and how to load/add them from the application dynamically by their name or id or path. 
  - Use `plugin-id` (there `~/git/ligoj-plugins/plugin-id`) as sample to add it in the app.
  - By contract make all plugins exposing 1 function `feature` that can be called from the application and other plugins.
  
The challenge is that each module like `plugin-id` is a standalone Maven project:
- it has its own life cycle
- it can be added, removed by a Java plugin manager discovered and served by a Webjars Servlet (`~/git/bootstrap/bootstrap-plugin/src/main/java/org/ligoj/bootstrap/resource/system/plugin/WebjarsServlet.java`).
- no restart or build is needed to add/remove a plugin from the context
- make it easy to test in local mode in browser. Maybe one Vite configuration per module?

# Core components

Core components are in `~/git/ligoj/app-ui/src/main/webapp/src/components`. They are share with the other plugins modules.
- `LigojDataTable` and `LigojDataTableServer` ar the base components for the data table.

---

# What was actually shipped

The plan above kept its bones but a few items shifted in practice — record here so the next plugin migration starts from reality, not the wish list.

- **VeeValidate / VeeValidateI18n** never landed. Vuetify's built-in `:rules` are enough for the forms we have and avoid a second validation library that the plugins would then have to learn.
- **`v-dialog` persistent** is removed globally so ESC closes any dialog (see "Decisions"). Don't re-add it without a strong reason.
- **i18n is modularised**: host keeps only generic keys (`common.*`, `nav.*`, `dashboard.*`, `agreement.*`, `error.*`, `profile.*`). Plugin-local keys ship inside each plugin's bundle and merge at `install()` time. See "Translations" below.
- **Theme system**: 12 themes live in `plugins/vuetify.js`; the user picks one from `ProfileView`. Persisted in `localStorage` under `ligoj-theme`.
- **Build chain**: Vite 8 with rolldown. `manualChunks` is rejected — use `output.codeSplitting.groups`. ESLint 9+ flat config (`eslint.config.js`); legacy `.eslintrc.cjs` is removed.
- **Lint baseline**: `js.configs.recommended` + `pluginVue.configs['flat/essential']` (NOT `flat/recommended` — too strict on the chosen one-attr-per-line style). `vue/valid-v-slot` runs with `{ allowModifiers: true }` because Vuetify data-table cell templates use dotted slot names (`#item.foo`).
- **Subscription row delegation** landed during the plugin-prov port. Plugins extend the row chrome by implementing `renderFeatures` / `renderDetailsKey` actions that return VNodes; the host mounts them via the `<PluginFeatures>` render-function component. See "Subscription row delegation" below.
- **Host-exposed Vuetify primitives**. `host.js` now re-exports `VBtn`, `VChip`, `VIcon`, `VTooltip` so plugin `feature()` actions can build VNodes with `h(VBtn, …)` without bundling their own Vuetify copy. New plugins should reach for `@ligoj/host` first before importing from `vuetify/components` directly.
- **`common.create` / `common.positive`** added to the host i18n bundle. The plugin-prov dialogs surfaced these missing keys; they're generic enough to live in `common.*`.

---

# Plugin migration recipe

Use this as a checklist when porting `plugin-<id>` (e.g. `plugin-prov`, `plugin-prov-aws`, …) from the legacy AMD bundle to Vue. `plugin-id` and `plugin-ui` are the two reference implementations — start by reading their `ui/` folder before writing your own.

## 1. Directory layout

Add a `ui/` sibling to the plugin's Maven `src/`:

```
plugin-<id>/
├── pom.xml
├── src/                        # Maven module — unchanged
└── ui/                         # Vue source — new
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    └── src/
        ├── index.js            # Plugin entry — see §2
        ├── service.js          # Optional: action dispatcher
        ├── i18n/
        │   ├── en.js           # Plain object with flat keys
        │   └── fr.js
        └── views/
            └── *.vue
```

`vite build` emits the bundle into `../src/main/resources/META-INF/resources/webjars/<id>/vue/` so Maven still packages it into the plugin JAR. No build-time symlink, no extra Maven plugin — just the right Vite `outDir`.

## 2. The plugin contract

`ui/src/index.js` must default-export an object with these fields. Host code reads them via `plugins/loader.js` and `plugins/registry.js`.

```js
import { useI18nStore } from '@ligoj/host'
import Plugin from './Plugin.vue'              // root component
import enMessages from './i18n/en.js'
import frMessages from './i18n/fr.js'
import service from './service.js'
import FooView from './views/FooView.vue'

const routes = [
  { path: '/<id>/foo', name: '<id>-foo', component: FooView },
]

const features = {
  // Action functions callable from other plugins via callFeature(<id>, action, …).
  doSomething: service.doSomething,
}

export default {
  id: '<id>',                                  // stable plugin id
  label: 'My Plugin',                          // display label
  component: Plugin,                           // optional root component
  routes,
  install({ router }) {
    // Merge translations BEFORE any view renders. The host pre-loads
    // required plugins synchronously in main.js, so views never see
    // missing keys.
    const i18n = useI18nStore()
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

Also at the top of `index.js`, inject the sibling stylesheet manually — Vite's library mode emits a separate `index.css` but does NOT auto-inject it on dynamic-import:

```js
if (typeof document !== 'undefined') {
  const id = 'ligoj-plugin-<id>-css'
  if (!document.getElementById(id)) {
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = new URL(/* @vite-ignore */ './index.css', import.meta.url).href
    document.head.appendChild(link)
  }
}
```

## 3. Vite config template

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Shared deps come from the host via the import map in index.html.
      // Marking them external keeps each plugin small and ensures one
      // pinia / vue runtime instance, not N copies.
      external: ['vue', 'vue-router', 'pinia', 'vuetify', '@ligoj/host'],
      output: { entryFileNames: 'index.js' },
    },
    outDir: resolve(__dirname, '../src/main/resources/META-INF/resources/webjars/<id>/vue'),
    emptyOutDir: true,
  },
})
```

## 4. Shared host surface (`@ligoj/host`)

Imported from the host bundle via the import map; treat as the public API and don't bypass it. Current exports (see `app-ui/src/main/webapp/src/host.js`):

| Export                                    | Purpose                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useApi`                                  | `get / post / put / del` against `rest/*`. Adds redirect handling, error toasts, and 401 → bounce-to-SPA-root behaviour.                                                 |
| `useAuthStore`                            | Session, roles, `redirectToLogin()`, OIDC-aware logout.                                                                                                                  |
| `useAppStore`                             | Breadcrumbs (`setBreadcrumbs(items, { refresh })`), title, refresh button in app bar.                                                                                    |
| `useI18nStore`                            | `t(key, params)`, `setLocale(loc)`, `merge(messages, locale?)`.                                                                                                          |
| `useErrorStore`                           | Toast queue (`push / success / info`), centralized API response handling.                                                                                                |
| `useClipboard`                            | `copy(text, { message })` with browser API + textarea fallback.                                                                                                          |
| `useDataTable`                            | Server-side paged table state (`load(options)`, `loadAll()`, `items`, `loading`, `error`, `demoMode`).                                                                   |
| `useFormGuard`                            | Unsaved-changes dialog + `onBeforeRouteLeave` integration.                                                                                                               |
| `LigojDataTable` / `LigojDataTableServer` | Wrappers around v-data-table with the tools menu (CSV export, copy). Header `tooltip` field supported.                                                                   |
| `LigojConfirmDialog`                      | Cancel/Confirm modal — use this everywhere instead of hand-rolled `v-dialog`s.                                                                                           |
| `NodeIcon` / `nodeIcon` / `NodeModeChip`  | Render a node's icon and subscription mode consistently.                                                                                                                 |
| `nodeType` / `isInstance`                 | Classify a node id (`service` / `feature` / `tool` / `instance`).                                                                                                        |
| `ImportExportBar`                         | CSV import/export header strip for list views.                                                                                                                           |
| `PluginFeatures`                          | Render-function delegate that mounts a plugin's VNodes for a subscription row (`renderFeatures`, `renderDetailsKey`, …). See "Subscription row delegation" below.        |
| `nodePluginId`                            | Returns the plugin id (the second `:`-segment) of a node — `service:prov:aws` → `'prov'`. Used by `PluginFeatures` to resolve the right plugin.                          |
| `VBtn` / `VChip` / `VIcon` / `VTooltip`   | Re-exports of Vuetify primitives. Plugins build their VNodes with `h(VBtn, …)` without bundling their own Vuetify (which would break shared theming and instance state). |
| `APP_BASE`                                | The host's `import.meta.env.BASE_URL` (`/ligoj/`). Plugin's own BASE is `/`, so always use this when building absolute paths.                                            |

## 5. Translations

Two reasons keys live with the plugin:

- the host bundle stays free of plugin churn,
- the translations are version-locked to the views that use them.

Inside the plugin: keep keys **flat** (the host's vue-i18n is configured with `messageResolver: (obj, path) => obj?.[path]`, no dot traversal).

```js
// ui/src/i18n/en.js
export default {
  '<id>.title': 'My Feature',
  '<id>.foo.deleteConfirm': 'Delete {name}?',
  // ...
}
```

Use them via `useI18nStore`:

```js
import { useI18nStore } from '@ligoj/host'
const { t } = useI18nStore()
t('<id>.foo.deleteConfirm', { name })
```

Keep table `headers` arrays as `computed(() => […])` so they re-evaluate on locale change — Vuetify will re-render the columns.

## 6. Routing

Routes are registered dynamically via `install({ router })`. Use kebab-case names (`<id>-foo`) to avoid clashes with other plugins. The host's router has a catch-all `/:pathMatch(.*)*` route that falls back to `PluginView`, so missing routes 404 cleanly.

Detail views generally **don't** want to be routes — open them as dialogs from the list view (see `UserEditDialog` in plugin-id). That avoids a second round-trip and keeps the user's table state.

## 7. Styles

Two patterns are in use:

- **SFC `<style scoped>`** — preferred for view-local styling. Vite library mode bundles them into `index.css` and the snippet in §2 auto-injects.
- **`<style>` (unscoped)** — for selectors that have to reach into Vuetify's teleported DOM (data-table cells, dialog overlays). Always namespace by a unique class on the SFC's root.

Global Vuetify tweaks live in `app-ui/src/main/webapp/src/assets/vuetify-overrides.css` and are imported once from `plugins/vuetify.js`. Add to that file instead of duplicating CSS in every plugin.

## 8. Building and testing

```bash
cd plugin-<id>/ui
npm install
npm run build          # emits to ../src/main/resources/.../webjars/<id>/vue/
npm run dev            # serves a standalone preview (rarely useful — see below)
npm run lint
```

For real integration testing, run the host's vite dev server (`app-ui/src/main/webapp`) — `npm run dev` there proxies `/ligoj/main/<id>/vue/*` to the backend, which serves the plugin's freshly-built bundle from `target/classes/`. So the cycle is:

1. Edit plugin source in `plugin-<id>/ui/src/`.
2. `npm run build` in the plugin's `ui/` folder.
3. Browser auto-reloads (vite watches the proxied URL).

Unit-test the plugin's authoring surface from the host's vitest setup — see `app-ui/src/main/webapp/src/__tests__/plugins/plugin-id.test.js` as the template. Important: `install()` reaches into the i18n store, so the test must `setActivePinia(createPinia())` before calling it.

For **view-level component tests** (mounting a plugin's SFC), follow the recipe in `__tests__/components/CatalogListView.test.js`:

1. `setActivePinia(createPinia())`.
2. `mergeMessages(plugin-en-bundle, 'en')` (or `'fr'`) — plugin-local keys are merged via `install()` in production, but tests bypass that path, so seed the bundle manually with `import { mergeMessages } from '@/plugins/i18n.js'`.
3. Mount with `global: { plugins: [vuetify, i18nPlugin, router] }` where `vuetify = createVuetify({ components, directives })`.
4. Stub `globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, ... }))` BEFORE mounting — `setup.js` pre-stubs it as a bare `vi.fn()`, and `vi.spyOn` doesn't replace an already-mocked fn reliably.

`setup.js` polyfills `ResizeObserver`, `IntersectionObserver`, and `visualViewport` so Vuetify's overlay components (`v-dialog`, `v-menu`, `v-tooltip`) mount under jsdom.

---

# Subscription row delegation

Plugins contribute to the host's subscription rows (in `ProjectDetailView`'s table) without owning the surrounding chrome. The host exposes a render-function component, `PluginFeatures`, that mounts a plugin's VNodes for a given subscription row:

```vue
<!-- In ProjectDetailView -->
<PluginFeatures :subscription="item" action="renderFeatures" />
<PluginFeatures :subscription="item" action="renderDetailsKey" />
```

`PluginFeatures` resolves the plugin from the subscription's node id (via `nodePluginId(subscription.node)`), lazy-loads it if the host hasn't pre-registered it, calls `plugin.feature(action, subscription)`, and mounts whatever VNodes come back.

Plugins implement these actions inside their `feature()` dispatcher. Today two are wired (in plugin-id and plugin-prov):

- **`renderFeatures(subscription)`** — small action icons next to the unsubscribe button.
- **`renderDetailsKey(subscription)`** — resource chips (counts, totals, location) for the details column.

The function returns VNodes (single, array, or `null`). The host never interprets HTML — the plugin paints its own pixels:

```js
import { h } from 'vue'
import { VBtn, VIcon, useI18nStore } from '@ligoj/host'

const features = {
  renderFeatures(subscription) {
    const { t } = useI18nStore()
    return [
      h(VBtn, {
        icon: true, size: 'small', variant: 'text',
        title: t('id.renderFeatures.manage'),
        to: `/id/group?subscription=${subscription.id}`,
      }, () => h(VIcon, { size: 'small' }, () => 'mdi-account-multiple')),
    ]
  },
  renderDetailsKey(subscription) {
    const count = subscription?.data?.members
    if (count == null) return null
    return h(VChip, { size: 'small', variant: 'tonal' }, () => `${count} members`)
  },
}
```

A plugin that doesn't implement an action throws from its dispatcher; `PluginFeatures` swallows that specific error so the column degrades cleanly to "nothing rendered". Real exceptions surface via `console.warn`.

`ProjectDetailView` also calls `rest/subscription/status/refresh?id=…&id=…` after the initial project load to populate `subscription.data` / `status` / fresh `parameters` — without that round-trip `renderDetailsKey` would always see `data === undefined` (the project endpoint omits live state by design).

---

# Decisions and gotchas

Battle scars worth respecting on the next migration.

## Vite / rolldown

- `manualChunks` (object or function) is rejected in Vite 8. Use `build.rollupOptions.output.codeSplitting.groups` with `priority` + `minSize: 0`. Vue must outrank Vuetify on priority — otherwise Vuetify pulls `@vue/*` into its chunk and `vue.js` is never emitted (breaking the import map).
- Default `chunkSizeWarningLimit: 500` fires on `vuetify.js` (~530 KB). Bumped to `700` host-side; the proper fix is `vite-plugin-vuetify` for per-component tree-shaking — currently not enabled.
- The host's `chunkFileNames` keeps stable filenames for `vue`, `router`, `pinia`, `vuetify`, `host`. The import map in `index.html` depends on those.

## Dev-server proxies

- All `/ligoj/*` paths the backend should see go through `vite.config.js` proxies. **`changeOrigin: false`** on `/ligoj/oauth2`, `/ligoj/login/oauth2`, and `/ligoj/logout` — Spring builds OAuth redirect URIs from the inbound `Host` header, and we need it to point at vite (`:5173`), not the backend (`:8080`).
- Other paths (`/ligoj/rest`, `/ligoj/main`, `/ligoj/webjars`, …) keep `changeOrigin: true`.

## Authentication

- `auth.fetchSession()` uses `redirect: 'manual'` so Spring's `302 → /oauth2/authorization/<client>` surfaces as `opaqueredirect` (status 0). The store sets `needsOAuthRedirect = true`; `redirectToLogin()` then top-level-navigates the browser to the OAuth entry (XHR can't follow cross-origin redirects).
- `error.js` on a 401 navigates to `${BASE_URL}` (the SPA root), not to `login.html` directly. The root re-runs the session probe and handles OIDC vs. local-login correctly.
- `auth.logout()` is a top-level navigation to `${BASE_URL}logout` — never an XHR. Required for Spring's `OidcClientInitiatedLogoutSuccessHandler` to drive the full Spring → Keycloak `end_session_endpoint` → back chain.
- In OIDC mode `login.html` is short-circuited on mount: it probes `/rest/session` and bounces to `/ligoj/` if Spring returns either `200` (already authenticated) or `opaqueredirect` (must go through OAuth). The local form only renders when Spring genuinely returned `401`.

## Vue Router 4

- Returning `false` from `onBeforeRouteLeave` consumes the `next` callback. Don't capture it and call later — that triggers an "Unhandled error during execution of native event handler" warning. Instead capture the target route and use `router.push(to)` after confirm. `useFormGuard` is the reference implementation.

## Vuetify

- `v-dialog persistent` was removed from every dialog so ESC closes uniformly. ESC fires `update:model-value=false`, which our handlers treat as Cancel — never as Save.
- `v-row dense` is deprecated in current Vuetify — use `density="comfortable"`.
- `v-data-table` cell templates use dotted slot names (`#item.foo`). ESLint's `vue/valid-v-slot` treats the dot as a directive modifier and trips; the rule is configured with `{ allowModifiers: true }` in the project's `eslint.config.js`.
- Vuetify's own widget i18n (data-table footer, etc.) is wired to the app locale via the `locale: { messages: { en, fr } }` block in `plugins/vuetify.js`, kept in sync by `setLocale()` in `plugins/i18n.js`.
- **v-select slot signature changed in v4**. The `#item` and `#selection` slots are now called with `{ item, internalItem, index, props }` where `item` is the **raw object directly** — `item.raw` was the Vuetify 3 wrapper. Reading `item.raw.foo` crashes with `Cannot read properties of undefined (reading 'foo')`. Fix: use `item.foo` (and pass `item`, not `item.raw`, to child components).
- **`:rules="[required]"` array literals trigger "Maximum recursive updates"**. Vuetify 4's `v-form` watches the `rules` prop by reference; an inline `[fn]` is a fresh array per render. When the input mounts inside an `v-expansion-panel-text` expand transition, v-form revalidates every frame and runs away. Always hoist:
  ```js
  const REQUIRED_RULES = [required]
  const REQUIRED_POSITIVE_RULES = [required, positive]
  ```
  Then use `:rules="REQUIRED_RULES"` in the template. Same fix for custom validators.
- **`v-combobox` + computed `:items` + `clearable` + expansion panel = infinite re-render**. Vuetify 4's combobox re-emits on mount when wrapped this way, looping forever. Either move items to a `shallowRef` (not a `computed`), add `eager` on the panel so content mounts on dialog open instead of during the expand transition, or fall back to `v-text-field` (used in plugin-prov for processor / architecture).
- **`v-expansion-panel` model**. Initialise the `v-expansion-panels` model with `null` (not `undefined`) — `undefined` triggers weird "open by default" behavior in Vuetify 4. Use `eager` to pre-render the body so inputs mount once, outside any transition.

## vue-i18n

- **Escape literal `@` with `{'@'}`**. vue-i18n treats `@` as the start of a linked-message reference (`@:foo`, `@.upper:foo`, `@{foo}`). Any literal `@` in a translation string throws `Invalid linked format` at message-compilation time and the whole bundle fails to load. Wrap with `{'@'}` (a v-i18n literal-placeholder) and switch the JS string delimiter to `"..."` so the single quotes inside don't need escaping:
  ```js
  'foo.workloadHint': "duration{'@'}cpu pairs, e.g. 100,40{'@'}20",
  ```
- **Locale changes don't fire** unless the component reads `t()` reactively. The host's `useI18nStore.t` is the proxy that tracks locale; plain string captures don't. Re-evaluate via `computed(() => t('foo'))` for derived strings.

## Forms / autocompletes

- Setting `form.value.<type>` (the discriminator) and `form.value.<value>` (the identifier) in the same synchronous block races: the watcher on `<type>` fires post-flush and wipes the identifier you just set. Set the type field first, `await nextTick()`, then set the value. See `DelegateEditView.vue`'s edit-mode load for the canonical fix.
- For server-side autocompletes, lazy-load the first page on `@update:menu` (dropdown open), not on mount. Users who never open the dropdown should make zero API calls.

## Plugins / build outputs

- A plugin's own `import.meta.env.BASE_URL` is `/`, not `/ligoj/`. Always use the host's `APP_BASE` export when building absolute URLs (`fetch`, `<img>` `src`, etc.).
- The Spring API container resolves `/main/<id>/vue/index.js` to the plugin's webjar resources. After `mvn install` of the plugin module, the new bundle is picked up without an API restart.

---

# Migration checklist (per plugin)

Copy/paste into the plugin's first PR description.

- [ ] `ui/` folder added with `package.json`, `vite.config.js`, `eslint.config.js`
- [ ] `ui/src/index.js` exports `{ id, label, install, feature, service, meta, routes }`
- [ ] `install()` registers routes AND merges `i18n/en.js` + `i18n/fr.js` into `useI18nStore`
- [ ] Sibling CSS auto-injection snippet present
- [ ] Plugin entry added to `REQUIRED_PLUGINS` in host `main.js` (if mandatory) or left to lazy-load via `App.vue`
- [ ] At least one happy-path view ported (use `LigojDataTableServer` + `LigojConfirmDialog` rather than rolling your own)
- [ ] Translations use **flat keys** in plugin's `i18n/{en,fr}.js`; host's `i18n/{en,fr}.js` untouched
- [ ] Existing legacy assets in `src/main/resources/META-INF/resources/<id>/` left alone — the plugin loader prefers `vue/index.js` and ignores the AMD bundle
- [ ] Test added in `app-ui/src/main/webapp/src/__tests__/plugins/plugin-<id>.test.js` mirroring the plugin-id one
- [ ] Lint passes: `npm run lint` in `ui/`
- [ ] Build passes: `npm run build` in `ui/` AND `mvn -pl <module> install` from the plugin repo
- [ ] Smoke test: navigate to a route, change locale, log out and back in through OIDC, refresh the page
