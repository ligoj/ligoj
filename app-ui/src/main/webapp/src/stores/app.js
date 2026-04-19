import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true)
  const title = ref('Ligoj')
  const breadcrumbs = ref([])
  const currentPlugin = ref(null)

  function setBreadcrumbs(items) {
    breadcrumbs.value = items
  }

  function setTitle(t) {
    title.value = t
    document.title = t ? `${t} - Ligoj` : 'Ligoj'
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    sidebarOpen, title, breadcrumbs, currentPlugin,
    setBreadcrumbs, setTitle, toggleSidebar,
  }
})
