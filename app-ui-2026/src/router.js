import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import DashboardView from '@2026/views/DashboardView.vue'
import ProfileView from '@2026/views/ProfileView.vue'
import LoginView from '@2026/views/LoginView.vue'
import UsersView from '@2026/views/UsersView.vue'

const routes = [
  { path: '/', name: 'home', component: DashboardView },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/id/user', name: 'id-user', component: UsersView },
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
