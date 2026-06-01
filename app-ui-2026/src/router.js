import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import DashboardView from '@2026/views/DashboardView.vue'
import ProfileView from '@2026/views/ProfileView.vue'
import LoginView from '@2026/views/LoginView.vue'
import UsersView from '@2026/views/UsersView.vue'
import GroupsView from '@2026/views/GroupsView.vue'
import CompaniesView from '@2026/views/CompaniesView.vue'
import DelegatesView from '@2026/views/DelegatesView.vue'

const routes = [
  { path: '/', name: 'home', component: DashboardView },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/id/user', name: 'id-user', component: UsersView },
  { path: '/id/group', name: 'id-group', component: GroupsView },
  { path: '/id/group/new', name: 'id-group-new', component: GroupsView },
  { path: '/id/group/:id', name: 'id-group-edit', component: GroupsView },
  { path: '/id/company', name: 'id-company', component: CompaniesView },
  { path: '/id/company/new', name: 'id-company-new', component: CompaniesView },
  { path: '/id/company/:id', name: 'id-company-view', component: CompaniesView },
  { path: '/id/delegate', name: 'id-delegate', component: DelegatesView },
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
