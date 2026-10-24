import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import LjDialog from '@/components/LjDialog.vue'
import LjConfirmDialog from '@/components/LjConfirmDialog.vue'

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

// An edit dialog guarded on its form: Cancel through the footer `close`, or the one of a panel through the content
// `close`, Save closing it from the parent
const Edit = {
  components: { LjDialog },
  setup() {
    return { open: ref(false), loading: ref(false), form: ref({ name: 'a' }) }
  },
  template: `<div>
    <LjDialog v-model="open" title="Edit" :guard="form" :guard-ready="!loading">
      <template #default="{ close }">
        <input class="name" v-model="form.name" />
        <button class="panel-cancel" @click="close">Cancel</button>
      </template>
      <template #footer="{ close }">
        <button class="cancel" @click="close">Cancel</button>
        <button class="save" @click="open = false">Save</button>
      </template>
    </LjDialog>
  </div>`,
}

describe('<LjDialog guard />', () => {
  let wrapper
  afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })

  // The dialog of a page, opened after `prepare`
  async function mountEdit(prepare = () => {}) {
    setActivePinia(createPinia())
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/edit', component: Edit }, { path: '/other', component: { template: '<p class="other" />' } }],
    })
    router.push('/edit')
    await router.isReady()
    wrapper = mount({ components: { RouterView }, template: '<RouterView />' }, { global: { plugins: [vuetify, router] }, attachTo: document.body })
    const edit = wrapper.findComponent(Edit)
    prepare(edit.vm)
    edit.vm.open = true
    await flushPromises()
    return { router, edit: edit.vm }
  }
  const asking = () => wrapper.findComponent(LjConfirmDialog).props('modelValue')
  async function click(selector) {
    document.body.querySelector(selector).click()
    await flushPromises()
  }
  async function type(value) {
    const input = document.body.querySelector('input.name')
    input.value = value
    input.dispatchEvent(new Event('input'))
    await flushPromises()
  }

  it('closes an unchanged form at once', async () => {
    const { edit } = await mountEdit()
    await click('.vmodal-head .x')
    expect(edit.open).toBe(false)
    expect(asking()).toBe(false)
  })

  it('discards the changes on Cancel without asking: the user chose to', async () => {
    const { router, edit } = await mountEdit()
    await type('b')
    await click('.cancel')
    expect(asking()).toBe(false)
    expect(edit.open).toBe(false)
    // Nothing left to hold a navigation with
    await router.push('/other')
    expect(router.currentRoute.value.path).toBe('/other')
  })

  it('discards the changes on the Cancel of a panel without asking', async () => {
    const { edit } = await mountEdit()
    await type('b')
    await click('.panel-cancel')
    expect(asking()).toBe(false)
    expect(edit.open).toBe(false)
  })

  it('asks before discarding the changes on the close button, and keeps them when the user goes on', async () => {
    const { edit } = await mountEdit()
    await type('b')
    await click('.vmodal-head .x')
    expect(asking()).toBe(true)
    expect(edit.open).toBe(true)

    await click('.vconfirm .vc-btn.ghost')
    expect(asking()).toBe(false)
    expect(edit.open).toBe(true)
    expect(edit.form.name).toBe('b')

    await click('.vmodal-head .x')
    await click('.vconfirm .vc-btn.confirm')
    expect(asking()).toBe(false)
    expect(edit.open).toBe(false)

    // A discarded form reopens clean
    edit.open = true
    await flushPromises()
    await click('.vmodal-head .x')
    expect(edit.open).toBe(false)
  })

  it('asks on Esc and the scrim too', async () => {
    const { edit } = await mountEdit()
    await type('b')

    // Esc and the scrim: the dialog requests its closing
    wrapper.findAllComponents({ name: 'VDialog' })[0].vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(asking()).toBe(true)
    expect(edit.open).toBe(true)
  })

  it('takes the baseline once a loading form is ready', async () => {
    const { edit } = await mountEdit((vm) => { vm.loading = true })
    edit.form = { name: 'loaded' }
    edit.loading = false
    await flushPromises()
    await click('.vmodal-head .x')
    expect(asking()).toBe(false)
    expect(edit.open).toBe(false)
  })

  it('closes at once when the profile skips the confirmation', async () => {
    localStorage.setItem('ligoj.skipUnsavedConfirmation', 'true')
    const { edit } = await mountEdit()
    await type('b')
    await click('.vmodal-head .x')
    expect(asking()).toBe(false)
    expect(edit.open).toBe(false)
  })

  it('asks before leaving the page with changes, and leaves on discard', async () => {
    const { router } = await mountEdit()
    await type('b')
    await router.push('/other')
    expect(router.currentRoute.value.path).toBe('/edit')
    expect(asking()).toBe(true)
    await click('.vconfirm .vc-btn.confirm')
    // The guard navigates again to the held route
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/other'))
  })

  it('never holds a navigation once closed, as after a save', async () => {
    const { router, edit } = await mountEdit()
    await type('b')
    await click('.save')
    expect(edit.open).toBe(false)
    await router.push('/other')
    expect(router.currentRoute.value.path).toBe('/other')
  })

  it('closes at once without a guard, its footer `close` included', async () => {
    setActivePinia(createPinia())
    wrapper = mount(LjDialog, {
      props: { modelValue: true, title: 'Notice' },
      slots: { footer: '<template #footer="{ close }"><button class="cancel" @click="close">Cancel</button></template>' },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await click('.cancel')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.findComponent(LjConfirmDialog).exists()).toBe(false)
  })

  it('gives `close` to its content too, for a form panel holding its own Cancel', async () => {
    setActivePinia(createPinia())
    wrapper = mount(LjDialog, {
      props: { modelValue: true, title: 'Panel' },
      slots: { default: '<template #default="{ close }"><button class="panel-cancel" @click="close">Cancel</button></template>' },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await click('.panel-cancel')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
