import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Path to the CURRENT app-ui source. We import its stores/composables/host
// read-only via the `@` alias (the same alias name app-ui uses internally,
// so its own `@/...` imports resolve here too). The current app is never
// modified — this is a separate Vite project that only reads from it.
const CORE = resolve(__dirname, '../app-ui/src/main/webapp/src')

export default defineConfig({
  plugins: [vue()],
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
    },
  },
})
