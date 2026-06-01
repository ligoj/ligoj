import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import HomeView from '@/views/HomeView.vue'
import ProfileView from '@/views/ProfileView.vue'
import ProfileView2026 from '@/views/ProfileView2026.vue'
import AboutView from '@/views/AboutView.vue'
import PluginView from '@/views/PluginView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/profile', name: 'profile', component: ProfileView },
  // UI 2026 redesign (feature/ui-2026): parallel page, opt-in via URL.
  // The original /profile stays the default; nothing here is modified.
  { path: '/next/profile', name: 'profile-2026', component: ProfileView2026 },
  { path: '/about', name: 'about', component: AboutView },
  // /id/* routes are registered at runtime by plugin-id.
  // /home/*, /system/*, /api/*, /subscribe are registered by plugin-ui.
  // Catch-all: tries to load a plugin, falls back to 404.
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
