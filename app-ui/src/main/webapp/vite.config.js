import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
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
