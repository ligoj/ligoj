import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * Dev-only: the import map in v-index.html points shared-dep bare specifiers
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
const SHIMS = {
  '/ligoj/assets/vue.js':     { from: 'vue' },
  '/ligoj/assets/router.js':  { from: 'vue-router' },
  '/ligoj/assets/pinia.js':   { from: 'pinia' },
  '/ligoj/assets/vuetify.js': { from: 'vuetify' },
  '/ligoj/assets/host.js':    { from: '/src/host.js' },
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
      if (!shim) return null
      return `export * from ${JSON.stringify(shim.from)};\n` +
             `import * as __ns from ${JSON.stringify(shim.from)};\n` +
             `export default __ns.default ?? __ns;\n`
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

export default defineConfig({
  plugins: [vue(), ligojDevSharedImports()],
  base: '/ligoj/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Resolve the shared-surface module locally during dev/test. At runtime
      // the browser resolves `@ligoj/host` via the import map in v-index.html.
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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'v-index.html'),
        login: resolve(__dirname, 'v-login.html'),
        host: resolve(__dirname, 'src/host.js'),
      },
      external: [/^\/main\//, /^\/ligoj\/main\//],
      output: {
        manualChunks: {
          vuetify: ['vuetify'],
          vue: ['vue'],
          router: ['vue-router'],
          pinia: ['pinia'],
        },
        // Stable filenames for shared deps so runtime-loaded plugins can
        // resolve `import 'vue'` (etc.) via the import map in v-index.html.
        // Other chunks stay hashed for cache-busting.
        chunkFileNames: (chunk) => {
          const stable = ['vue', 'router', 'pinia', 'vuetify']
          return stable.includes(chunk.name)
            ? 'assets/[name].js'
            : 'assets/[name]-[hash].js'
        },
        entryFileNames: (chunk) => {
          // `host` is the shared-surface entry consumed by runtime plugins —
          // must resolve to a stable URL so the import map doesn't drift.
          return chunk.name === 'host'
            ? 'assets/host.js'
            : 'assets/[name]-[hash].js'
        },
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
      '/ligoj/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ligoj/logout': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ligoj/captcha.png': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ligoj/webjars': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
