import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import ProfileView from '@/views/ProfileView.vue'
import AboutView from '@/views/AboutView.vue'
import PluginView from '@/views/PluginView.vue'

// /home/*, /project/*, /system/*, /api/*, /subscribe are registered at
// runtime by plugin-ui. /id/* routes are registered at runtime by
// plugin-id. The host declares only its own surface.
const routes = [
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/about', name: 'about', component: AboutView },
  { path: '/:pathMatch(.*)*', name: 'plugin', component: PluginView },
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
