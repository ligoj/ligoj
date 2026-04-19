import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth.js'

const vuetify = createVuetify({ components, directives })

function mountView() {
  return mount(HomeView, {
    global: {
      plugins: [vuetify],
      stubs: { RouterLink: true },
    },
  })
}

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('displays welcome message with username', async () => {
    const auth = useAuthStore()
    auth.session = {
      userName: 'testuser',
      roles: ['USER'],
      uiAuthorizations: ['.*'],
      apiAuthorizations: [],
      applicationSettings: {},
    }

    const wrapper = mountView()
    expect(wrapper.text()).toContain('testuser')
    expect(wrapper.text()).toContain('Dashboard')
  })

  it('shows cards based on navItems', async () => {
    const auth = useAuthStore()
    auth.session = {
      userName: 'admin',
      roles: ['ADMIN'],
      uiAuthorizations: ['.*'],
      apiAuthorizations: [],
      applicationSettings: {},
    }

    const wrapper = mountView()
    // Admin sees all nav items → should have cards for Users, Groups, Companies, Delegates, Projects, Administration
    expect(wrapper.text()).toContain('Users')
    expect(wrapper.text()).toContain('Projects')
  })

  it('shows alert when no cards available', () => {
    const auth = useAuthStore()
    auth.session = {
      userName: 'limited',
      roles: ['USER'],
      uiAuthorizations: ['^$'], // only home
      apiAuthorizations: [],
      applicationSettings: {},
    }

    const wrapper = mountView()
    expect(wrapper.text()).toContain('No modules available')
  })
})
