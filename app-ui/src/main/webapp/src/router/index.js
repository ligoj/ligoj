import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import ProfileView from '@/views/ProfileView.vue'
import AboutView from '@/views/AboutView.vue'
import PluginView from '@/views/PluginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import UsersView from '@/views/UsersView.vue'
import GroupsView from '@/views/GroupsView.vue'
import CompaniesView from '@/views/CompaniesView.vue'
import DelegatesView from '@/views/DelegatesView.vue'
import ScopesView from '@/views/ScopesView.vue'
import SystemNodesView from '@/views/SystemNodesView.vue'
import SystemConfigurationView from '@/views/SystemConfigurationView.vue'
import SystemCacheView from '@/views/SystemCacheView.vue'
import SystemBenchView from '@/views/SystemBenchView.vue'
import SystemInfoView from '@/views/SystemInfoView.vue'
import SystemPluginsView from '@/views/SystemPluginsView.vue'
import SystemRolesView from '@/views/SystemRolesView.vue'
import SystemUsersView from '@/views/SystemUsersView.vue'
import ApiHomeView from '@/views/ApiHomeView.vue'
import ApiTokenView from '@/views/ApiTokenView.vue'

const routes = [
  { path: '/', name: 'home', component: DashboardView },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/about', name: 'about', component: AboutView },

  { path: '/project', name: 'projects', component: ProjectsView },
  { path: '/project/:id', name: 'project-detail', component: ProjectDetailView },

  { path: '/id/user', name: 'users', component: UsersView },
  { path: '/id/group', name: 'groups', component: GroupsView },
  { path: '/id/company', name: 'companies', component: CompaniesView },
  { path: '/id/delegate', name: 'delegates', component: DelegatesView },
  { path: '/id/scope', name: 'scopes', component: ScopesView },

  { path: '/system/node', name: 'system-nodes', component: SystemNodesView },
  { path: '/system/configuration', name: 'system-config', component: SystemConfigurationView },
  { path: '/system/cache', name: 'system-cache', component: SystemCacheView },
  { path: '/system/bench', name: 'system-bench', component: SystemBenchView },
  { path: '/system/information', name: 'system-info', component: SystemInfoView },
  { path: '/system/plugin', name: 'system-plugins', component: SystemPluginsView },
  { path: '/system/role', name: 'system-roles', component: SystemRolesView },
  { path: '/system/user', name: 'system-users', component: SystemUsersView },

  { path: '/api', name: 'api-home', component: ApiHomeView },
  { path: '/api/token', name: 'api-token', component: ApiTokenView },

  // Catch-all: any unknown route falls back to the plugin loader.
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
