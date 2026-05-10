import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true)
  const title = ref('Ligoj')
  const breadcrumbs = ref([])
  const currentPlugin = ref(null)
  /**
   * Optional handler the app-bar renders as a Refresh button next to
   * the breadcrumbs. Cleared on every `setBreadcrumbs` call so each
   * page re-opts in explicitly via `setBreadcrumbs(items, { refresh })`.
   */
  const refresh = ref(null)

  function setBreadcrumbs(items, opts = {}) {
    breadcrumbs.value = items
    refresh.value = typeof opts.refresh === 'function' ? opts.refresh : null
    if (items.length) setTitle(items.slice(-1)[0].title)
  }

  function setRefresh(fn) {
    refresh.value = typeof fn === 'function' ? fn : null
  }

  function setTitle(t) {
    title.value = t
    document.title = t ? `${t} - Ligoj` : 'Ligoj'
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    sidebarOpen, title, breadcrumbs, currentPlugin, refresh,
    setBreadcrumbs, setRefresh, setTitle, toggleSidebar,
  }
})
