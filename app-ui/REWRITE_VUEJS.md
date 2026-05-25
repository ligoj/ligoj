# Where to start (fresh session orientation)

If you're picking this up cold, the fastest path to context is:

1. **Read this doc end-to-end** — sections later in the file are denser than the intro.
2. **Read the reference plugins**:
   - `ligoj-plugins/plugin-id/ui/src/index.js` — service-level plugin contract.
   - `ligoj-plugins/plugin-id-ldap/ui/src/index.js` — tool-level (sub-plugin) variant.
   - `ligoj-plugins/plugin-ui/ui/src/views/SubscribeWizardView.vue` — the central subscription/node wizard. Subscribe + edit-node + create-node modes.
3. **Read the host surface**:
   - `app-ui/src/main/webapp/src/host.js` — public API plugins consume.
   - `app-ui/src/main/webapp/src/plugins/loader.js` — `loadPlugin`, `pluginIdFromKey`, `requires` handling, in-flight dedup.
   - `app-ui/src/main/webapp/src/plugins/registry.js` — `register`, `get`, `callFeature`.
4. **Run the tests** to confirm the workspace is sound before changing anything:
   - Host suite: `cd app-ui/src/main/webapp && npm run test --silent`.
   - Per plugin: `cd ligoj-plugins/plugin-<id>/ui && npm test`. Plugin contract tests live in each plugin's own repo (see §9). The host suite only exercises host-internal modules now.

When in doubt: "Status snapshot" lists exactly what's shipped, "Decisions and gotchas" lists what bit somebody on the way here.

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

# Status snapshot

What's actually shipped in this branch — record here so the next plugin migration starts from reality, not the wish list.

## Reference implementations (read these first)

| Plugin           | Role                                                    | What it demonstrates                                                                                                                                                |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-id`      | Service-level plugin with full CRUD views               | The "fat" pattern: routes, root component, list/edit views, `renderFeatures` / `renderDetailsKey` / `renderDetailsFeatures` hooks, parent-to-child delegation hook. |
| `plugin-ui`      | Service-level plugin with shared UI views (the wizards) | Cross-plugin shared views: `SubscribeWizardView` (subscribe / edit-node / create-node modes), `SystemNodeView`, `ProjectDetailView`, …                              |
| `plugin-id-ldap` | Tool-level sub-plugin                                   | The "thin" pattern: no routes, no component. Just i18n labels + a `renderFeatures` hook the parent merges in. Declares `requires: ['id']`.                          |
| `plugin-prov`    | Large service-level plugin (legacy)                     | The first port — `renderFeatures` and `renderDetailsKey` patterns originated here.                                                                                  |

## Infrastructure decisions

- **VeeValidate / VeeValidateI18n** never landed. Vuetify's built-in `:rules` are enough; avoids a second validation library plugins would have to learn.
- **`v-dialog` persistent** is removed globally so ESC closes any dialog. See "Decisions" — don't re-add without a strong reason.
- **i18n is modularised**: host keeps only generic keys (`common.*`, `nav.*`, `dashboard.*`, `agreement.*`, `error.*`, `profile.*`). Plugins ship their own keys via `useI18nStore().merge(...)` in `install()`. See "Translations" and "Parameter form conventions".
- **Theme system**: 12 themes in `plugins/vuetify.js`; user picks via `ProfileView`. Persisted in `localStorage` under `ligoj-theme`.
- **Build chain**: Vite 8 with rolldown. `manualChunks` rejected — use `output.codeSplitting.groups`. ESLint 9+ flat config (`eslint.config.js`); no `.eslintrc.cjs`.
- **Lint baseline**: `js.configs.recommended` + `pluginVue.configs['flat/essential']` (NOT `flat/recommended`). `vue/valid-v-slot` runs with `{ allowModifiers: true }` because Vuetify data-table cell templates use dotted slot names (`#item.foo`).
- **Host-exposed Vuetify primitives**: `host.js` re-exports `VBtn`, `VChip`, `VIcon`, `VTooltip`. Plugin `feature()` actions build VNodes with `h(VBtn, …)` without bundling their own Vuetify copy.

## Plugin loading model (current)

- **Pre-loaded** in `main.js`: `REQUIRED_PLUGINS = ['id', 'ui', 'prov']`. The host's sidebar nav references `/id/*` and `/prov/*` routes statically, so these must register their routes before the router mounts.
- **Lazy-loaded** in `App.vue` on session ready: `auth.appSettings.plugins` is run through `pluginIdFromKey(...)` (strips `service:` / `feature:` prefix, swaps `:` for `-`) before being passed to `loadAllPlugins`. The backend's `FeaturePlugin.getKey()` returns `service:id:ldap`; the loader needs `id-ldap`.
- **Just-in-time** via `loadPlugin(id)`: triggered by the wizard's `ensureToolPluginLoaded(nodeId)` whenever it fetches parameters, and by `PluginFeatures` when it encounters an unloaded subscription plugin.
- **Declared dependencies** via `requires: ['id']` on the plugin manifest. The loader awaits these BEFORE calling `install()`, so parent i18n is merged and registry slot exists by the time the sub-plugin runs. `plugin-id-ldap` uses this — `plugin-id` could be dropped from `REQUIRED_PLUGINS` without breaking LDAP.
- **Concurrency**: `loadPlugin` dedupes in-flight loads via a `Map<id, Promise>`, so the wizard's lazy load and a sub-plugin's `requires` can race the same id without double-importing.

## Subscription wizard (`SubscribeWizardView`)

One file, three modes — used by everything that creates or edits subscriptions and nodes:

| Mode          | Trigger                                  | Steps shown                                        | Result                                                                                                              |
| ------------- | ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `subscribe`   | `/subscribe` route (from project detail) | Service → Tool → Instance → Mode → Params          | POST `rest/subscription`                                                                                            |
| `edit-node`   | "Edit" in `SystemNodeView` (dialog)      | Read-only chain + editable Name + Params           | PUT `rest/node` (uses `node` field, not `refined` — `NodeEditionVo` has no `setRefined`, Jackson drops `refined:`). |
| `create-node` | "New node" in `SystemNodeView` (dialog)  | Service → Tool → new-instance form + Mode + Params | POST `rest/node` with full payload (id, name, **`node`** (parent), mode, parameters).                               |

Parameters are auto-rendered from `/rest/node/<tool-id>/parameter/<MODE>` — the wizard reads parameter labels and descriptions via `t(p.id)` and `t(p.id + '-description')` against the unified i18n store. See "Parameter form conventions".

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
  id: '<id>',                                  // stable plugin id (URL-safe)
  label: 'My Plugin',                          // display label
  component: Plugin,                           // optional root component
  routes,
  requires: ['<parent-id>'],                   // optional — see "Tool-level variant" below
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

### Tool-level (sub-plugin) variant

Tool-level plugins like `plugin-id-ldap` (lives at `service:id:ldap`) augment a service-level parent. They typically:

- **Don't** export routes or a root component. The parent provides them.
- **Declare** `requires: ['<parent-id>']` so the loader pulls the parent (and its i18n) before this plugin's `install()` runs.
- **Ship** an i18n bundle with parameter labels keyed on the parameter ids the tool owns (e.g. `service:id:ldap:base-dn`). The subscribe wizard's flat `t(p.id)` lookup resolves them automatically — see "Parameter form conventions".
- **Implement** `renderFeatures` (and friends). The parent's `service.js` looks for a sub-plugin via `subPluginIdFor(node)` — for a node `service:id:ldap:local`, this resolves to `id-ldap` and the parent merges the child's VNodes into its own row buttons.

Minimal sub-plugin manifest:

```js
import { useI18nStore } from '@ligoj/host'
import enMessages from './i18n/en.js'
import frMessages from './i18n/fr.js'
import service from './service.js'

const features = { renderFeatures: service.renderFeatures }

export default {
  id: 'id-ldap',
  label: 'Identity LDAP',
  requires: ['id'],                            // parent must be loaded first
  install() {
    const i18n = useI18nStore()
    i18n.merge(enMessages, 'en')
    i18n.merge(frMessages, 'fr')
  },
  feature(action, ...args) {
    const fn = features[action]
    if (!fn) throw new Error(`Plugin "id-ldap" has no feature "${action}"`)
    return fn(...args)
  },
  service,
  meta: { icon: 'mdi-folder-network-outline', color: 'blue-grey-darken-2' },
}
```

The parent's delegation hook (lives in the parent's `service.js`):

```js
import { pluginRegistry } from '@ligoj/host'

function subPluginIdFor(subscription) {
  const id = subscription?.node?.id || ''
  const parts = id.split(':').filter(Boolean)
  if (parts.length < 3) return null              // not a tool/instance
  return `${parts[1]}-${parts[2]}`               // e.g. service:id:ldap → 'id-ldap'
}

function delegateToToolPlugin(subscription, action) {
  const subId = subPluginIdFor(subscription)
  if (!subId) return []
  const plugin = pluginRegistry.get(subId)
  if (typeof plugin?.feature !== 'function') return []
  try {
    const result = plugin.feature(action, subscription)
    return result == null ? [] : (Array.isArray(result) ? result : [result])
  } catch (err) {
    if (!new RegExp(`no feature ["']${action}["']`).test(err?.message || '')) {
      console.warn(`[plugin:<parent>] delegate to ${subId}.${action} threw`, err)
    }
    return []
  }
}

// Inside renderFeatures(subscription):
const buttons = [/* parent's own VNodes */]
buttons.push(...delegateToToolPlugin(subscription, 'renderFeatures'))
return buttons
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

| Export                                    | Purpose                                                                                                                                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useApi`                                  | `get / post / put / del` against `rest/*`. Adds redirect handling, error toasts, and 401 → bounce-to-SPA-root behaviour.                                                                                                                        |
| `useAuthStore`                            | Session, roles, `redirectToLogin()`, OIDC-aware logout.                                                                                                                                                                                         |
| `useAppStore`                             | Breadcrumbs (`setBreadcrumbs(items, { refresh })`), title, refresh button in app bar.                                                                                                                                                           |
| `useI18nStore`                            | `t(key, params)`, `setLocale(loc)`, `merge(messages, locale?)`.                                                                                                                                                                                 |
| `useErrorStore`                           | Toast queue (`push / success / info`), centralized API response handling.                                                                                                                                                                       |
| `useClipboard`                            | `copy(text, { message })` with browser API + textarea fallback.                                                                                                                                                                                 |
| `useDataTable`                            | Server-side paged table state (`load(options)`, `loadAll()`, `items`, `loading`, `error`, `demoMode`).                                                                                                                                          |
| `useFormGuard`                            | Unsaved-changes dialog + `onBeforeRouteLeave` integration.                                                                                                                                                                                      |
| `LigojDataTable` / `LigojDataTableServer` | Wrappers around v-data-table with the tools menu (CSV export, copy). Header `tooltip` field supported.                                                                                                                                          |
| `LigojConfirmDialog`                      | Cancel/Confirm modal — use this everywhere instead of hand-rolled `v-dialog`s.                                                                                                                                                                  |
| `NodeIcon` / `nodeIcon` / `NodeModeChip`  | Render a node's icon and subscription mode consistently.                                                                                                                                                                                        |
| `nodeType` / `isInstance`                 | Classify a node id (`service` / `feature` / `tool` / `instance`).                                                                                                                                                                               |
| `ImportExportBar`                         | CSV import/export header strip for list views.                                                                                                                                                                                                  |
| `PluginFeatures`                          | Render-function delegate that mounts a plugin's VNodes for a subscription row (`renderFeatures`, `renderDetailsKey`, …). See "Subscription row delegation" below.                                                                               |
| `nodePluginId`                            | Returns the plugin id (the second `:`-segment) of a node — `service:prov:aws` → `'prov'`. Used by `PluginFeatures` to resolve the right plugin.                                                                                                 |
| `VBtn` / `VChip` / `VIcon` / `VTooltip`   | Re-exports of Vuetify primitives. Plugins build their VNodes with `h(VBtn, …)` without bundling their own Vuetify (which would break shared theming and instance state).                                                                        |
| `APP_BASE`                                | The host's `import.meta.env.BASE_URL` (`/ligoj/`). Plugin's own BASE is `/`, so always use this when building absolute paths.                                                                                                                   |
| `pluginRegistry` / `callFeature`          | Direct registry access for parent-to-child delegation (`subPluginIdFor`, `delegateToToolPlugin`). `callFeature` throws on missing plugin; prefer `pluginRegistry.get(id)?.feature?.(...)` when graceful degradation matters.                    |
| `loadPlugin` / `pluginIdFromKey`          | Lazy-load a sibling plugin at runtime. The wizard uses these to `ensureToolPluginLoaded(nodeId)` before rendering parameter labels, so i18n inheritance works even if discovery hasn't run. `pluginIdFromKey('service:id:ldap')` → `'id-ldap'`. |

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

## 6. Parameter form conventions

The subscribe wizard auto-renders the parameter form for any node. To make it look good for **your** plugin's parameters, ship the right i18n keys.

### Wire shape (`ParameterVo`)

The backend serialises an enum-style `type`. **Values are UPPERCASE** — `TEXT`, `BOOL`, `SELECT`, `MULTIPLE`, `INTEGER`, `DATE`, `TAGS`. The wizard normalises via `typeKind(p) = String(p.type).toLowerCase()`.

```jsonc
{
  "id": "service:id:ldap:base-dn",     // ← matches the i18n key
  "type": "TEXT",                       // ← uppercase
  "mandatory": false,
  "secured": false,                     // ← drives password masking
  "defaultValue": null,
  "min": null, "max": null,             // INTEGER only
  "values": [],                         // SELECT/MULTIPLE/TAGS only
  "depends": []
}
```

Notable backend gaps (not yet exposed in `ParameterVo`):

- **No `name` / `description`** — labels and hints come from the plugin's i18n bundle. Anything reading `p.name` or `p.description` is dead code.
- **No `pattern`** — `Parameter.data` stores `{"pattern": "..."}` server-side for TEXT but `NodeHelper.toVo()` doesn't expose it. Live regex validation on text inputs needs a backend change to surface this.
- **`secured`** drives the password input — not the parameter name. The legacy `p.name.toLowerCase().includes('password')` heuristic doesn't work because `p.name` doesn't exist.

### i18n contract for parameters

Two keys per parameter:

```js
// In your plugin's ui/src/i18n/en.js
export default {
  'service:id:ldap:base-dn': 'Base DN',                                    // label
  'service:id:ldap:url': 'Connection URLs',
  'service:id:ldap:url-description': 'Comma-separated URLs, failover only', // optional hint
  // ...
}
```

Wizard helpers:

- `paramLabel(p) = t(p.id) ?? p.id` — falls back to the raw id so missing keys are visible.
- `paramHint(p) = t(p.id + '-description')` or `null` — suppresses the `:persistent-hint` slot when undefined.
- `tOrNull(key)` detects vue-i18n's "key not found → echo back" behaviour and returns `null`. Use it in any helper that wants to distinguish "missing" from "blank".

### Inherited parameter labels

A subscription on `service:id:ldap:local` carries both LDAP-specific parameters (`service:id:ldap:*`, owned by `plugin-id-ldap`) and identity-shared ones (`service:id:group`, `service:id:ou`, owned by `plugin-id`). The wizard's flat `t(p.id)` lookup is plugin-agnostic — it just reads from the unified store. **Each owning plugin ships its keys; inheritance falls out for free.**

When porting a tool-level plugin, ship only the keys YOUR plugin's CSV declares. Let the parent ship the inherited ones.

### Lazy-loading the right bundle

The wizard's `ensureToolPluginLoaded(nodeId)` runs at parameter-fetch time (and from `bootstrapEdit` for the edit-node mode). It converts the node id to a plugin id via `pluginIdFromKey` and fires `loadPlugin(...)` best-effort:

```js
function ensureToolPluginLoaded(nodeId) {
  const pluginId = pluginIdFromKey(nodeId)        // 'service:id:ldap' → 'id-ldap'
  if (!pluginId) return
  loadPlugin(pluginId).catch(() => {})            // 404 ok — keeps rendering with raw ids
}
```

vue-i18n's reactive store re-renders labels in place when `mergeLocaleMessage` fires, so a late-arriving bundle just refreshes the form — no race between parameter fetch and bundle download.

## 7. Routing

Routes are registered dynamically via `install({ router })`. Use kebab-case names (`<id>-foo`) to avoid clashes with other plugins. The host's router has a catch-all `/:pathMatch(.*)*` route that falls back to `PluginView`, so missing routes 404 cleanly.

Detail views generally **don't** want to be routes — open them as dialogs from the list view (see `UserEditDialog` in plugin-id). That avoids a second round-trip and keeps the user's table state.

## 8. Styles

Two patterns are in use:

- **SFC `<style scoped>`** — preferred for view-local styling. Vite library mode bundles them into `index.css` and the snippet in §2 auto-injects.
- **`<style>` (unscoped)** — for selectors that have to reach into Vuetify's teleported DOM (data-table cells, dialog overlays). Always namespace by a unique class on the SFC's root.

Global Vuetify tweaks live in `app-ui/src/main/webapp/src/assets/vuetify-overrides.css` and are imported once from `plugins/vuetify.js`. Add to that file instead of duplicating CSS in every plugin.

## 9. Building and testing

```bash
cd plugin-<id>/ui
npm install
npm run build          # emits to ../src/main/resources/.../webjars/<id>/vue/
npm run dev            # serves a standalone preview (rarely useful — see below)
npm run lint
npm test               # vitest run — plugin-local contract / view tests
```

For real integration testing, run the host's vite dev server (`app-ui/src/main/webapp`) — `npm run dev` there proxies `/ligoj/main/<id>/vue/*` to the backend, which serves the plugin's freshly-built bundle from `target/classes/`. So the cycle is:

1. Edit plugin source in `plugin-<id>/ui/src/`.
2. `npm run build` in the plugin's `ui/` folder.
3. Browser auto-reloads (vite watches the proxied URL).

### Plugin-local tests (vitest in `plugin-<id>/ui/`)

Plugin contract tests live in the plugin repo, not the host. The host's `__tests__/plugins/` folder only keeps host-internal tests (`registry.test.js`, `plugin-contracts.test.js`, `nls-adapter.test.js`, `provFormatters.test.js`, `useProvApi.test.js` — the in-tree legacy plugins still under `@/plugins/`). Plugin tests run with `npm test` inside the plugin's `ui/` folder.

The setup is mechanical. The reference is `plugin-id-ldap/ui/` — copy it for any new migration.

**1. Devs deps in `package.json`:**

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@vue/test-utils": "^2.4.10",
    "jsdom": "^28.1.0",
    "pinia": "^3.0.4",
    "vitest": "^4.1.5"
    // …plus the build deps you already have
  }
}
```

**2. `vite.config.js` — add `resolve.alias`, `resolve.dedupe` and a `test` block:**

```js
const HOST_SRC = resolve(__dirname, '../../../ligoj/app-ui/src/main/webapp/src')

export default defineConfig({
  // …existing build config…
  resolve: {
    alias: {
      // Pull the real host surface in for tests / dev. At runtime the
      // browser resolves @ligoj/host via the import map in index.html;
      // the build keeps it external.
      '@ligoj/host': resolve(HOST_SRC, 'host.js'),
      // host.js transitively imports `@/stores/*`, `@/composables/*`, …
      // The plugin's own code never uses `@/`, so this only affects
      // host-side imports pulled in through @ligoj/host.
      '@': HOST_SRC,
    },
    // CRITICAL. Without dedupe each side of the test picks its own
    // node_modules copy of pinia (etc.) and `setActivePinia` from
    // the test never reaches `useI18nStore` resolved via @ligoj/host.
    dedupe: ['vue', 'pinia', 'vue-router', 'vuetify'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.js'],
    exclude: ['node_modules/**', 'dist/**'],
    css: false,
    server: { deps: { inline: ['vuetify'] } },
  },
})
```

**3. `src/__tests__/setup.js`** — fetch stub, localStorage, ResizeObserver / IntersectionObserver / visualViewport polyfills. Copy from `plugin-id-ldap/ui/src/__tests__/setup.js`.

**4. Test imports** — use `@ligoj/host` for the registry / stores; relative paths for plugin and sibling-plugin sources:

```js
import { pluginRegistry, callFeature } from '@ligoj/host'
import pluginIdLdapDef from '../index.js'                                  // local
import pluginIdDef from '../../../../plugin-id/ui/src/index.js'            // sibling repo
```

`install()` reaches into the i18n store, so any test that calls it must `setActivePinia(createPinia())` first.

### View-level component tests (mounting a plugin's SFC)

For SFC mount tests inside the plugin repo:

1. `setActivePinia(createPinia())`.
2. Seed plugin-local i18n keys via `useI18nStore().merge(enBundle, 'en')` — `install()` does this in production; tests bypass that path.
3. Mount with `global: { plugins: [vuetify, router] }` where `vuetify = createVuetify({ components, directives })`. The host's `i18n` plugin is already initialised by `useI18nStore`.
4. Stub `globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, … }))` BEFORE mounting — `setup.js` pre-stubs it as a bare `vi.fn()`, and `vi.spyOn` doesn't replace an already-mocked fn reliably.

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

Plugins implement these actions inside their `feature()` dispatcher. Three are wired today (across plugin-id, plugin-prov, plugin-id-ldap):

- **`renderFeatures(subscription)`** — small action icons next to the unsubscribe button.
- **`renderDetailsKey(subscription)`** — stable resource chips for the details column (resource id, provider name, …).
- **`renderDetailsFeatures(subscription)`** — live resource chips (counts, quotas) — refreshed by the `rest/subscription/status/refresh` round-trip described below.

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

## Parent-to-child delegation

`PluginFeatures` resolves to the **service-level** plugin (segment 2 of the node id — `service:id:ldap:local` → `'id'`). To get tool-specific contributions (`plugin-id-ldap`'s activity exports, etc.) on top of the parent's buttons, the parent's `renderFeatures` looks up its tool sub-plugin and merges:

```js
// Inside plugin-id/ui/src/service.js
function subPluginIdFor(subscription) {
  const parts = (subscription?.node?.id || '').split(':').filter(Boolean)
  if (parts.length < 3) return null
  return `${parts[1]}-${parts[2]}`              // service:id:ldap:* → 'id-ldap'
}
const buttons = [/* parent's own */]
buttons.push(...delegateToToolPlugin(subscription, 'renderFeatures'))
```

The sub-plugin doesn't need to know about delegation — it just implements `renderFeatures` like any other plugin. The parent decides where in its output the child's VNodes go (typically appended).

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
- **Missing keys are echoed back, not `null`**. vue-i18n's default behaviour with `messageResolver: (obj, path) => obj?.[path] ?? null` is to return the key string when no message matches. For helpers that want to detect missing keys (label fallback, suppressing an empty hint), wrap with `tOrNull(key) = (value === key ? null : value)`. The subscribe wizard does this for `paramHint`.
- **Colons in keys are fine** — the host's vue-i18n is configured with a flat `messageResolver` (no dot/colon traversal), so `service:id:ldap:base-dn` is a literal lookup. This is what makes parameter id → label resolution work.

## Backend interop

- **`ParameterType` is serialised UPPERCASE** (`TEXT`, `BOOL`, …). Always normalise via `typeKind(p)` before comparing — lowercase literals like `p.type === 'text'` silently never match.
- **`NodeEditionVo` parent field is `node`, NOT `refined`**. The class implements `Refining<String>` with an override `getRefined() { return getNode(); }` but **no `setRefined`**, so Jackson silently drops `refined:` on POST/PUT and the `@NotBlank` validation on `node` rejects the payload. The wizard's create-node / edit-node paths both use `node: parentId`.
- **`UriColonDecodingFilter`** (in app-api's `Application.java`) is a servlet filter at `HIGHEST_PRECEDENCE` that substitutes `%3A` → `:` in the request URI before CXF matches routes. JAX-RS `@Path("{node:service:.+}/parameter/{mode}")` regexes are matched against the RAW URI, so a `encodeURIComponent`'d node id (`service%3Aid%3Aldap`) 404s without this filter. Don't decode other percent-encodings (especially `%2F`) — only `:` is safe per RFC 3986 sub-delim rules.
- **Plugin discovery uses colon-keys** (`auth.appSettings.plugins` returns `['service:id', 'service:id:ldap', …]`). The frontend converts via `pluginIdFromKey('service:id:ldap')` → `'id-ldap'` before passing to `loadPlugin`. The loader's id validation regex `^[a-zA-Z0-9][\w-]*$` rejects raw colon-keys, so the transformation is non-negotiable.

## Plugin loader

- **`requires: ['<parent-id>']`** declares a hard dependency. The loader awaits all `requires` before calling the dependent's `install()`, so parent i18n is merged and registry slot is populated. Use this for any tool-level plugin instead of relying on `REQUIRED_PLUGINS`.
- **In-flight dedup** is via `Map<id, Promise>`. Concurrent `loadPlugin(<id>)` calls share one Promise; the cleanup `.finally()` runs after success/failure. Safe to call from multiple places (wizard's `ensureToolPluginLoaded`, a sub-plugin's `requires`, lazy discovery in `App.vue`).
- **Re-entrant safe**: `loaded` and `inFlight` keep ordering correct even when a parent's `install()` triggers another `loadPlugin` indirectly (e.g. through `useI18nStore` side-effects).
- **Single-line cycle protection**: `requires` is processed via `Promise.all` (parallel). If two plugins require each other, both stall forever. Don't do that — keep `requires` a strict tree.

## Forms / autocompletes

- Setting `form.value.<type>` (the discriminator) and `form.value.<value>` (the identifier) in the same synchronous block races: the watcher on `<type>` fires post-flush and wipes the identifier you just set. Set the type field first, `await nextTick()`, then set the value. See `DelegateEditView.vue`'s edit-mode load for the canonical fix.
- For server-side autocompletes, lazy-load the first page on `@update:menu` (dropdown open), not on mount. Users who never open the dropdown should make zero API calls.

## Plugins / build outputs

- A plugin's own `import.meta.env.BASE_URL` is `/`, not `/ligoj/`. Always use the host's `APP_BASE` export when building absolute URLs (`fetch`, `<img>` `src`, etc.).
- The Spring API container resolves `/main/<id>/vue/index.js` to the plugin's webjar resources. After `mvn install` of the plugin module, the new bundle is picked up without an API restart.

---

# Migration checklist (per plugin)

Copy/paste into the plugin's first PR description.

## Service-level plugin

- [ ] `ui/` folder added with `package.json`, `vite.config.js`, `eslint.config.js`
- [ ] `ui/src/index.js` exports `{ id, label, install, feature, service, meta, routes }`
- [ ] `install()` registers routes AND merges `i18n/en.js` + `i18n/fr.js` into `useI18nStore`
- [ ] Sibling CSS auto-injection snippet present (Vite library mode doesn't auto-inject)
- [ ] Plugin entry added to `REQUIRED_PLUGINS` in host `main.js` if the host's sidebar nav references its routes; otherwise let `App.vue`'s lazy load via `pluginIdFromKey` pick it up
- [ ] At least one happy-path view ported (use `LigojDataTableServer` + `LigojConfirmDialog` rather than rolling your own)
- [ ] Parameter labels: every CSV-declared parameter id has a matching key in `i18n/{en,fr}.js` (and an optional `-description` for the hint)
- [ ] Translations use **flat keys** in plugin's `i18n/{en,fr}.js`; host's `i18n/{en,fr}.js` untouched
- [ ] Existing legacy assets in `src/main/resources/META-INF/resources/<id>/` left alone — the loader prefers `vue/index.js` and ignores the AMD bundle
- [ ] Plugin-local vitest scaffolding wired up: `package.json` scripts/devDeps, `vite.config.js` aliases + `dedupe` + `test` block, `src/__tests__/setup.js`. See "Plugin-local tests" in §9 — `plugin-id-ldap/ui/` is the reference.
- [ ] Contract test in `plugin-<id>/ui/src/__tests__/plugin-<id>.test.js` mirroring `plugin-id-ldap.test.js`
- [ ] Lint passes: `npm run lint` in `ui/`
- [ ] Tests pass: `npm test` in `ui/`
- [ ] Build passes: `npm run build` in `ui/` AND `mvn -pl <module> install` from the plugin repo
- [ ] Smoke test: navigate to a route, change locale, log out and back in through OIDC, refresh the page

## Tool-level (sub-plugin) variant — `plugin-id-ldap` template

Use this when the plugin is a tool implementation of an existing service (`service:<parent>:<tool>`). It typically inherits everything except parameter labels and tool-specific row actions.

- [ ] `ui/` folder with same skeleton as a service-level plugin
- [ ] `ui/src/index.js` declares `requires: ['<parent-id>']` — loader pulls the parent before installing
- [ ] `install()` only merges i18n (no routes, no component)
- [ ] i18n covers **only this tool's CSV-declared parameters** — inherited keys (`service:<parent>:*`) come from the parent's bundle
- [ ] `service.js` implements `renderFeatures(subscription)` for tool-specific row actions; the parent merges them via `subPluginIdFor(...)` / `delegateToToolPlugin(...)`
- [ ] No bundle URL conflict: parent's manifest id and tool's manifest id resolve to different webjar paths (`webjars/<parent>/vue/` vs `webjars/<parent>-<tool>/vue/`)
- [ ] Contract test in `plugin-<parent>-<tool>/ui/src/__tests__/` asserts `requires: ['<parent-id>']` so the dependency stays declared. The test typically also imports the parent's `index.js` (sibling-repo relative path) to exercise parent → tool delegation.
