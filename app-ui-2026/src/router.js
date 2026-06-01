import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import DashboardView from '@2026/views/DashboardView.vue'
import ProfileView from '@2026/views/ProfileView.vue'

const routes = [
  { path: '/', name: 'home', component: DashboardView },
  { path: '/profile', name: 'profile', component: ProfileView },
]

const router = createRouter({
  history: createWebHashHistory('/ligoj/'),
  routes,
})

// Soft session probe: try to load the session (shared with the main app via
// the proxied backend cookie) but never block rendering — this is a preview
// app, so it stays usable even without an active session.
router.beforeEach(async () => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    try { await auth.fetchSession() } catch { /* render anyway */ }
  }
})

export default router
