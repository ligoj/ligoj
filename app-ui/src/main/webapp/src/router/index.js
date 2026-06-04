import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import ProfileView from '@/views/ProfileView.vue'
import AboutView from '@/views/AboutView.vue'
import PluginView from '@/views/PluginView.vue'

// Host shell routes only. Every domain screen (dashboard `/`, `/project*`,
// `/id/*`, `/system/*`, `/api*`) is now owned by a plugin and registered
// through `install({ router })` at load time — see plugin-ui / plugin-id.
// `main.js` awaits `loadAllPlugins(REQUIRED_PLUGINS)` BEFORE `app.use(router)`
// and `mount`, so those plugin routes exist by the time the first navigation
// resolves. The catch-all keeps any not-yet-registered path falling back to
// the lazy plugin loader.
const routes = [
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/about', name: 'about', component: AboutView },

  // Catch-all: anything not registered by a plugin falls back to the
  // plugin loader (which lazy-loads the owning plugin, or 404s cleanly).
  { path: '/:pathMatch(.*)*', name: 'not-found', component: PluginView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async () => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    const ok = await auth.fetchSession()
    if (!ok) {
      auth.redirectToLogin()
      return false
    }
  }
})

export default router
