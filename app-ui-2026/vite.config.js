import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Path to the CURRENT app-ui source. We import its stores/composables/host
// read-only via the `@` alias (the same alias name app-ui uses internally,
// so its own `@/...` imports resolve here too). The current app is never
// modified — this is a separate Vite project that only reads from it.
const CORE = resolve(__dirname, '../app-ui/src/main/webapp/src')

// --- Backend proxy --------------------------------------------------------
// Single configurable target so testers can run against their own populated
// Ligoj. Point it at YOUR backend without editing code:
//   LIGOJ_BACKEND=https://ligoj.acme npm run dev
// `cookieDomainRewrite` rehosts the JSESSIONID on localhost so the shared
// session survives the proxy; `secure:false` tolerates self-signed TLS.
const BACKEND = process.env.LIGOJ_BACKEND || 'http://localhost:8080'
const PROXY_PATHS = [
  '/ligoj/rest',        // REST API
  '/ligoj/login',       // Spring Security form login
  '/ligoj/logout',      // Spring Security logout
  '/ligoj/captcha.png', // login recovery / reset CAPTCHA
  '/ligoj/main',        // runtime plugin Vue bundles (id/ui/prov…)
]
const BACKEND_PROXY = Object.fromEntries(
  PROXY_PATHS.map((p) => [p, {
    target: BACKEND,
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: 'localhost',
  }]),
)

// Dev-only import map. Runtime-loaded plugin bundles import `vue`,
// `vue-router`, `pinia`, `vuetify` and `@ligoj/host` as bare specifiers
// (externalised in their own build). We point those at thin shim modules
// (src/shims/*.js → `export * from '<dep>'`) so Vite resolves them to the
// SAME instances the 2026 app uses — sharing the registry, pinia stores and
// i18n store, so plugin install()/feature() contributions reach our views.
// Injected only in `serve` mode; the production build would instead ship
// pre-built /assets/*.js like app-ui's index.html.
function pluginImportmap() {
  const imports = {
    vue: '/ligoj/src/shims/vue.js',
    'vue-router': '/ligoj/src/shims/vue-router.js',
    pinia: '/ligoj/src/shims/pinia.js',
    vuetify: '/ligoj/src/shims/vuetify.js',
    '@ligoj/host': '/ligoj/src/shims/host.js',
  }
  const tag = `<script type="importmap">${JSON.stringify({ imports })}</script>`
  return {
    name: 'ligoj-2026-plugin-importmap',
    apply: 'serve',
    transformIndexHtml: (html) => html.replace('</head>', `${tag}\n</head>`),
  }
}

export default defineConfig({
  plugins: [vue(), pluginImportmap()],
  base: '/ligoj/',
  resolve: {
    alias: {
      // Core (current app) — keep the SAME alias name so core's internal
      // `@/...` imports resolve against core, not this app.
      '@': CORE,
      '@ligoj/host': resolve(CORE, 'host.js'),
      // This UI-2026 app's own source.
      '@2026': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    // We reuse core code + its node_modules (e.g. @mdi/font fonts) which live
    // outside this project's root. Allow the whole ligoj repo so Vite can
    // serve those files (otherwise the mdi webfont 403s and icons show tofu).
    fs: { allow: [resolve(__dirname, '..')] },
    // Proxy the backend API to a running Ligoj, mirroring app-ui's dev proxy
    // so the shared auth session / REST endpoints work as-is. Point this at
    // YOUR backend without editing code:  LIGOJ_BACKEND=https://ligoj.acme npm run dev
    proxy: BACKEND_PROXY,
  },
})
