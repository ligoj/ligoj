import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { readFileSync } from 'node:fs'

/**
 * Dev-only: the import map in index.html points shared-dep bare specifiers
 * (vue, vue-router, pinia, vuetify, @ligoj/host) at /ligoj/assets/*.js —
 * build artefacts that don't exist under `npm run dev`. Plugins loaded at
 * runtime from the webjars servlet carry `import ... from "vue"` in their
 * compiled output; without these shims the browser 404s on the import map
 * target and the plugin fails to load.
 *
 * Each shim is registered as a virtual module so vite's normal transform
 * pipeline resolves the bare specifier through its dep-optimizer and
 * rewrites it to the pre-bundled URL. The middleware exposes that
 * transformed code at the exact URL the import map asks for.
 */
// Re-export a library's whole surface: every named export, plus a default that
// falls back to the namespace for libraries without one. The SAME shape backs
// both the dev middleware shims and the production facade entries, so plugins
// see an identical `import ... from "vue"` surface in dev and in a built WAR.
const sharedShimSource = (from) =>
  `export * from ${JSON.stringify(from)};\n` +
  `import * as __ns from ${JSON.stringify(from)};\n` +
  `export default __ns.default ?? __ns;\n`

const SHIMS = {
  '/ligoj/assets/vue.js': { from: 'vue' },
  '/ligoj/assets/router.js': { from: 'vue-router' },
  '/ligoj/assets/pinia.js': { from: 'pinia' },
  '/ligoj/assets/vuetify.js': { from: 'vuetify' },
  '/ligoj/assets/host.js': { from: '/src/host.js' },
}

// Production build: each shared singleton is a facade ENTRY (below) re-exporting
// its library. `chunk.name` -> library; the virtual id is the rollup input.
// `@ligoj/host` is a real entry already (src/host.js), so it is not listed here.
const SHARED_LIBS = {
  vue: 'vue',
  router: 'vue-router',
  pinia: 'pinia',
  vuetify: 'vuetify',
}
const FACADE_PREFIX = 'virtual:ligoj-shared/'
const SHARED_FACADE_IDS = Object.fromEntries(
  Object.keys(SHARED_LIBS).map((name) => [name, FACADE_PREFIX + name]),
)

/**
 * Dev-only: serve `favicon.ico` from the webapp root at `/ligoj/favicon.ico`.
 *
 * Production gets the favicon from the WAR root (Maven packs `webapp/`
 * as the WAR), but vite's dev server only auto-serves files from
 * `<root>/public` — we don't have one, and adopting it would also pull
 * in every other webapp-root file (HTML entries, themes, error pages),
 * conflicting with vite's own routing. Setting `publicDir: false` and
 * serving the single file we actually need keeps both worlds clean:
 * dev sees the favicon, the production WAR layout is unchanged.
 */
/**
 * Match both the base-prefixed path (the one the HTML actually links to)
 * AND the bare `/favicon.ico` that some browsers auto-fetch independently
 * of `<link rel=icon>`. Keep this list small — anything else routes
 * through vite's normal handling.
 */
const FAVICON_PATHS = new Set(['/ligoj/favicon.ico', '/favicon.ico'])

/**
 * Sniff the actual content type. The file at `webapp/favicon.ico` is
 * historically a PNG with an `.ico` extension — production tolerates
 * that because Jetty serves it with whatever the extension implies and
 * most browsers fall back to content sniffing. Vite's dev server
 * doesn't do extension-based content-type mapping for our middleware,
 * so we set the right type explicitly. Firefox in strict-MIME mode and
 * some webkit builds reject PNG bytes served as `image/x-icon`.
 */
function sniffImageType(buf) {
  if (!buf || buf.length < 4) return 'image/x-icon'
  // PNG header: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  // ICO header: 00 00 01 00
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return 'image/x-icon'
  // SVG starts with `<` (0x3C). Coarse but enough for the favicon case.
  if (buf[0] === 0x3C) return 'image/svg+xml'
  return 'image/x-icon'
}

function ligojDevFavicon() {
  let buf = null
  let mime = 'image/x-icon'
  try {
    buf = readFileSync(resolve(__dirname, 'favicon.ico'))
    mime = sniffImageType(buf)
  } catch {
    // `favicon.ico` missing — leave `buf` null so the middleware falls
    // through to a 404 instead of crashing the dev server on boot.
  }
  return {
    name: 'ligoj-dev-favicon',
    apply: 'serve',
    configureServer(server) {
      // Use the unmounted (req.url-inspecting) form rather than connect's
      // `.use(path, handler)`. The mounted form does prefix-matching and
      // rewrites `req.url`, which can interact poorly with vite's own
      // internal asset middlewares — the inspection form follows the
      // exact same pattern as `ligojDevSharedImports` above and is known
      // to fire before vite's static handler 404s.
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0]
        if (!urlPath || !FAVICON_PATHS.has(urlPath)) return next()
        if (!buf) return next()
        res.setHeader('Content-Type', mime)
        // Disable caching in dev so a browser that previously cached a
        // 404 doesn't keep showing a missing icon. Chrome / Safari
        // sometimes hold the favicon cache across normal reloads, so
        // an explicit `no-cache` is the only reliable way to force a
        // revalidation per page load.
        res.setHeader('Cache-Control', 'no-cache')
        res.end(buf)
      })
    },
  }
}

function ligojDevSharedImports() {
  return {
    name: 'ligoj-dev-shared-imports',
    apply: 'serve',
    resolveId(id) {
      return SHIMS[id] ? id : null
    },
    load(id) {
      const shim = SHIMS[id]
      return shim ? sharedShimSource(shim.from) : null
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0]
        if (!urlPath || !SHIMS[urlPath]) return next()
        try {
          const result = await server.transformRequest(urlPath)
          if (result) {
            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Cache-Control', 'no-cache')
            res.end(result.code)
            return
          }
        } catch (err) {
          console.error('[ligoj-dev-shim]', urlPath, err)
        }
        next()
      })
    },
  }
}

/**
 * Production build: expose each shared singleton (vue, vue-router, pinia,
 * vuetify) as a stable-URL facade ENTRY re-exporting the library's full public
 * API under its REAL names. Runtime-loaded plugins are built separately and
 * import those names (`import { createElementBlock } from 'vue'`) via the import
 * map. A plain advancedChunks group instead emits a non-entry chunk whose
 * exports rolldown minifies to the mangled subset the host happens to use, so
 * the plugin import fails with "'vue' does not provide createElementBlock".
 * Facade entries + `preserveEntrySignatures` keep every real name.
 */
function ligojSharedFacades() {
  return {
    name: 'ligoj-shared-facades',
    apply: 'build',
    resolveId(id) {
      return id.startsWith(FACADE_PREFIX) ? id : null
    },
    load(id) {
      if (!id.startsWith(FACADE_PREFIX)) return null
      const from = SHARED_LIBS[id.slice(FACADE_PREFIX.length)]
      return from ? sharedShimSource(from) : null
    },
  }
}

// Dev-only: serve the locally-built `ai` plugin bundle straight from the
// sibling plugin-ai repo (webjars/ai/vue), BYPASSING the `/ligoj/main` proxy to
// app-api. This lets `npm run build` in plugin-ai/ui + a browser reload reflect
// UI changes instantly — no jar rebuild/redeploy, no app-api restart. The file
// is read per request so rebuilds are picked up live; if the local build is
// absent (e.g. plugin-ai not checked out beside ligoj), it falls through to the
// proxy so nothing breaks. Remove this plugin to go back to the jar-served bundle.
function ligojDevLocalAiBundle() {
  const AI_DIR = resolve(
    __dirname,
    '../../../../../ligoj-plugins/plugin-ai/src/main/resources/META-INF/resources/webjars/ai/vue',
  )
  return {
    name: 'ligoj-dev-local-ai-bundle',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0]
        const match = urlPath && urlPath.match(/^\/ligoj\/main\/ai\/vue\/index\.(js|css)$/)
        if (!match) return next()
        try {
          const buf = readFileSync(resolve(AI_DIR, `index.${match[1]}`))
          res.setHeader('Content-Type', match[1] === 'css' ? 'text/css' : 'text/javascript')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(buf)
        } catch {
          next() // local build missing → fall through to the app-api proxy
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), ligojDevSharedImports(), ligojSharedFacades(), ligojDevFavicon(), ligojDevLocalAiBundle()],
  base: '/ligoj/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Resolve the shared-surface module locally during dev/test. At runtime
      // the browser resolves `@ligoj/host` via the import map in index.html.
      '@ligoj/host': resolve(__dirname, 'src/host.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.js'],
    exclude: ['e2e/**', 'node_modules/**'],
    css: false,
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
  },
  build: {
    // Vuetify ships ~530 KB minified — that's the whole component
    // library and we already split shared deps off. Raise the warning
    // threshold so it stops firing on a chunk we accept; revisit if we
    // tree-shake Vuetify via vite-plugin-vuetify.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        loginByApiKey: resolve(__dirname, 'login-by-api-key.html'),
        host: resolve(__dirname, 'src/host.js'),
        // Shared singletons as facade entries (see ligojSharedFacades): each
        // re-exports its library's full public API under real names, at the
        // stable URL the import map targets. Being entries, they are each their
        // own chunk (no minSize merging) and their exports are preserved.
        vue: SHARED_FACADE_IDS.vue,
        router: SHARED_FACADE_IDS.router,
        pinia: SHARED_FACADE_IDS.pinia,
        vuetify: SHARED_FACADE_IDS.vuetify,
      },
      // Keep every entry's full export surface under its real names, even though
      // the host imports these libraries internally too. Without this, rolldown
      // renames the shared chunks' exports to internal aliases and runtime
      // plugins can't resolve `import { createElementBlock } from 'vue'`.
      preserveEntrySignatures: 'allow-extension',
      external: [/^\/main\//, /^\/ligoj\/main\//],
      onwarn(warning, defaultHandler) {
        // The shared facades deliberately fall back to the module namespace as
        // the `default` export for libraries that have none (vue, vue-router,
        // pinia, vuetify), so this static "import `default` is undefined" note
        // is expected. Everything else passes through.
        if (warning.code === 'IMPORT_IS_UNDEFINED' && /`default`/.test(warning.message ?? '')) {
          return
        }
        defaultHandler(warning)
      },
      output: {
        // The shared singletons (+ host) keep stable, unhashed filenames so the
        // import map in index.html never drifts; every other chunk is hashed for
        // cache-busting.
        entryFileNames: (chunk) => {
          const stable = ['host', 'vue', 'router', 'pinia', 'vuetify']
          return stable.includes(chunk.name) ? 'assets/[name].js' : 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
    outDir: resolve(__dirname, '../../../target/classes/META-INF/resources/webjars/vue-dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/ligoj/rest': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Spring Boot Actuator endpoints (management.endpoints.web.base-path),
      // surfaced by the Actuator admin view. Same backend as `rest`.
      '/ligoj/manage': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // app-ui's OWN actuator (UI container) — served locally by app-ui, NOT
      // proxied to ligoj-api. Surfaces the UI container log to the Logs view.
      '/ligoj/actuator': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ligoj/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // `/ligoj/login.html` and `/ligoj/login-by-api-key.html` are
        // the SPA's own static login pages — let vite serve them from
        // `app-ui/src/main/webapp/` instead of forwarding to the
        // backend (which has no resource at those paths in OAuth2Bff
        // mode, and would 302 us into the auth flow, looping forever
        // after a `?denied` failure URL). The other paths under
        // `/ligoj/login*` — the form-login POST, the API-key POST
        // (`/login-by-api-key`), and the `/login/oauth2/code/<client>`
        // OAuth callback — must still proxy through, so we only
        // bypass the `.html` files explicitly. The narrower
        // `/ligoj/login/oauth2` proxy below keeps its own settings.
        bypass(req) {
          if (req.url?.startsWith('/ligoj/login.html')) return req.url
          if (req.url?.startsWith('/ligoj/login-by-api-key.html')) return req.url
        },
      },
      // Spring Security OIDC endpoints: /oauth2/authorization/{client}
      // starts the IdP flow (Spring 302s the browser to the configured
      // provider); /login/oauth2/code/{client} is the callback that
      // sets the session cookie. Both must reach the backend or the
      // OAuth dance can't complete in dev.
      //
      // `changeOrigin` is intentionally OFF here: Spring builds the
      // OAuth `redirect_uri` from the inbound `Host` header. We need
      // it to point at vite (`localhost:5173`) so the IdP redirects
      // back to the browser, not to the backend port (`:8080`).
      // For the same reason the OAuth callback proxy preserves Host.
      // (Alternative: add `xfwd: true` and set
      // `server.forward-headers-strategy=framework` in
      // application.properties — closer to a prod reverse-proxy.)
      '/ligoj/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      '/ligoj/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      '/ligoj/logout': {
        target: 'http://localhost:8080',
        // Same reason as /ligoj/oauth2: Spring builds the OIDC
        // `post_logout_redirect_uri` from the inbound Host header,
        // and we need it to point at vite (`localhost:5173`).
        changeOrigin: false,
      },
      '/ligoj/captcha.png': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Plugin assets: app-ui's /main/* servlet proxies to ligoj-api on :8081.
      '/ligoj/main': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Legacy: kept for any code still fetching /webjars/* directly.
      '/ligoj/webjars': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
