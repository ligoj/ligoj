import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import LjDialog from '@/components/LjDialog.vue'

const vuetify = createVuetify({ components, directives })

function render(props = {}) {
  setActivePinia(createPinia())
  return mount(LjDialog, {
    props: { modelValue: true, title: 'Edit user', ...props },
    slots: { default: '<p class="body">content</p>' },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('<LjDialog />', () => {
  let wrapper
  afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })

  it('renders the title without a badge by default', () => {
    wrapper = render()
    const head = document.body.querySelector('.vmodal-head h3')
    expect(head.textContent.trim()).toBe('Edit user')
    expect(document.body.querySelector('.vmodal-head .badge')).toBeNull()
  })

  it('highlights the entity identifier after the title when `badge` is set', () => {
    wrapper = render({ badge: 'francois.saito@sample.com' })
    const badge = document.body.querySelector('.vmodal-head h3 .badge')
    expect(badge).not.toBeNull()
    expect(badge.tagName).toBe('CODE')
    expect(badge.textContent).toBe('francois.saito@sample.com')
    // The badge sits inside the heading, after the title text.
    const heading = document.body.querySelector('.vmodal-head h3').textContent
    expect(heading.startsWith('Edit user')).toBe(true)
    expect(heading.endsWith('francois.saito@sample.com')).toBe(true)
  })
})
