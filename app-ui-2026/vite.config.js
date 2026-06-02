import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Path to the CURRENT app-ui source. We import its stores/composables/host
// read-only via the `@` alias (the same alias name app-ui uses internally,
// so its own `@/...` imports resolve here too). The current app is never
// modified — this is a separate Vite project that only reads from it.
const CORE = resolve(__dirname, '../app-ui/src/main/webapp/src')

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
    // Proxy the backend API to the running ligoj-api, mirroring app-ui's
    // dev proxy so the shared auth session / REST endpoints work as-is.
    proxy: {
      '/ligoj/rest': { target: 'http://localhost:8080', changeOrigin: true },
      '/ligoj/login': { target: 'http://localhost:8080', changeOrigin: true },
      // CAPTCHA image used by the login's recovery / reset modes.
      '/ligoj/captcha.png': { target: 'http://localhost:8080', changeOrigin: true },
      // Backend logout (Spring Security) — used by the shell's logout button.
      '/ligoj/logout': { target: 'http://localhost:8080', changeOrigin: true },
      // Plugin Vue bundles, served by the backend's /main proxy servlet
      // (e.g. /ligoj/main/id/vue/index.js). Lets the host's dynamic plugin
      // loader import real plugin bundles so their i18n, parameter fields and
      // subscription-detail renderers work — parity with the live app.
      '/ligoj/main': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
