import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import HomeView from '@/views/HomeView.vue'
import UserListView from '@/views/UserListView.vue'
import GroupListView from '@/views/GroupListView.vue'
import CompanyListView from '@/views/CompanyListView.vue'
import DelegateListView from '@/views/DelegateListView.vue'
import ProjectListView from '@/views/ProjectListView.vue'
import ProjectEditView from '@/views/ProjectEditView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import UserEditView from '@/views/UserEditView.vue'
import GroupEditView from '@/views/GroupEditView.vue'
import CompanyEditView from '@/views/CompanyEditView.vue'
import DelegateEditView from '@/views/DelegateEditView.vue'
import ContainerScopeView from '@/views/ContainerScopeView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AboutView from '@/views/AboutView.vue'
import AdminView from '@/views/AdminView.vue'
import PluginView from '@/views/PluginView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/about', name: 'about', component: AboutView },
  { path: '/id/user', name: 'id-user', component: UserListView },
  { path: '/id/user/new', name: 'id-user-new', component: UserEditView },
  { path: '/id/user/:id', name: 'id-user-edit', component: UserEditView },
  { path: '/id/group', name: 'id-group', component: GroupListView },
  { path: '/id/group/new', name: 'id-group-new', component: GroupEditView },
  { path: '/id/group/:id', name: 'id-group-edit', component: GroupEditView },
  { path: '/id/company', name: 'id-company', component: CompanyListView },
  { path: '/id/company/new', name: 'id-company-new', component: CompanyEditView },
  { path: '/id/company/:id', name: 'id-company-edit', component: CompanyEditView },
  { path: '/id/delegate', name: 'id-delegate', component: DelegateListView },
  { path: '/id/delegate/new', name: 'id-delegate-new', component: DelegateEditView },
  { path: '/id/delegate/:id', name: 'id-delegate-edit', component: DelegateEditView },
  { path: '/id/container-scope', name: 'id-container-scope', component: ContainerScopeView },
  { path: '/home/project', name: 'project', component: ProjectListView },
  { path: '/home/project/new', name: 'project-new', component: ProjectEditView },
  { path: '/home/project/:id', name: 'project-detail', component: ProjectDetailView },
  { path: '/home/project/:id/edit', name: 'project-edit', component: ProjectEditView },
  { path: '/admin', name: 'admin', component: AdminView },
  // Catch-all: tries to load a plugin, falls back to 404
  { path: '/:pathMatch(.*)*', name: 'not-found', component: PluginView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    const ok = await auth.fetchSession()
    if (!ok) {
      window.location.href = 'v-login.html'
      return false
    }
  }
})

export default router
