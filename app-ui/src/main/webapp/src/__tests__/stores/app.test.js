import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app.js'

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has default values', () => {
    const store = useAppStore()
    expect(store.sidebarOpen).toBe(true)
    expect(store.title).toBe('Ligoj')
    expect(store.breadcrumbs).toEqual([])
    expect(store.currentPlugin).toBeNull()
  })

  it('setTitle updates title and document.title', () => {
    const store = useAppStore()
    store.setTitle('Projects')
    expect(store.title).toBe('Projects')
    expect(document.title).toBe('Projects - Ligoj')
  })

  it('setTitle with empty string sets Ligoj', () => {
    const store = useAppStore()
    store.setTitle('')
    expect(document.title).toBe('Ligoj')
  })

  it('setBreadcrumbs updates breadcrumbs', () => {
    const store = useAppStore()
    const crumbs = [{ title: 'Home', to: '/' }, { title: 'Projects' }]
    store.setBreadcrumbs(crumbs)
    expect(store.breadcrumbs).toEqual(crumbs)
  })

  it('toggleSidebar flips sidebarOpen', () => {
    const store = useAppStore()
    expect(store.sidebarOpen).toBe(true)
    store.toggleSidebar()
    expect(store.sidebarOpen).toBe(false)
    store.toggleSidebar()
    expect(store.sidebarOpen).toBe(true)
  })
})
