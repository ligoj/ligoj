import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import BugReportDialog from '@/components/BugReportDialog.vue'
import { useAuthStore } from '@/stores/auth.js'

const vuetify = createVuetify({ components, directives })

let wrapper

// v-dialog teleports its content to <body>, so assertions go through
// `document`, not `wrapper.find`. Each test mounts a single dialog and tears
// it down in afterEach to keep the teleported markup from leaking across tests.
async function openDialog() {
  wrapper = mount(BugReportDialog, {
    attachTo: document.body,
    props: { modelValue: true },
    global: { plugins: [vuetify] },
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const template = () => document.querySelector('.bug-template')?.value ?? ''

function seedSession(applicationSettings) {
  const auth = useAuthStore()
  auth.session = {
    userName: 'tester',
    roles: ['USER'],
    uiAuthorizations: ['.*'],
    apiAuthorizations: [],
    applicationSettings: applicationSettings ?? {
      buildVersion: '4.0.2-test',
      plugins: ['service:id:ldap', 'service:prov:aws'],
    },
  }
}

describe('<BugReportDialog>', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.location.hash = '#/about'
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    delete navigator.clipboard
  })

  it('builds a template containing the version, the URL and the plugins', async () => {
    seedSession()
    await openDialog()

    const text = template()
    expect(text).toContain('4.0.2-test')
    expect(text).toContain('#/about')
    expect(text).toContain('service:id:ldap')
    expect(text).toContain('service:prov:aws')
    expect(text).toContain('## Description')
    expect(text).toContain('## Context')
  })

  it('uses the path when there is no hash, and never leaks a domain', async () => {
    seedSession()
    window.location.hash = ''
    await openDialog()

    const text = template()
    // jsdom default pathname is "/"; no protocol/host should appear.
    expect(text).not.toContain('http')
    expect(text).not.toContain('localhost')
  })

  it('copies the template to the clipboard via the Clipboard API', async () => {
    seedSession()
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await openDialog()

    document.querySelector('.bug-btn.primary').click()
    await nextTick()

    expect(writeText).toHaveBeenCalledTimes(1)
    const copied = writeText.mock.calls[0][0]
    expect(copied).toContain('4.0.2-test')
    expect(copied).toContain('service:id:ldap')
  })

  it('falls back gracefully when the Clipboard API is unavailable', async () => {
    seedSession()
    delete navigator.clipboard
    document.execCommand = vi.fn().mockReturnValue(true)
    await openDialog()

    // Should not throw, and should fall back to execCommand('copy').
    document.querySelector('.bug-btn.primary').click()
    await nextTick()
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('links to the Ligoj GitHub issue form in a new tab', async () => {
    seedSession()
    await openDialog()

    const link = document.querySelector('.bug-foot a.bug-btn')
    expect(link.getAttribute('href')).toContain('https://github.com/ligoj/ligoj/issues/new')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('shows a no-plugin placeholder when none are installed', async () => {
    seedSession({ buildVersion: '1.0', plugins: [] })
    await openDialog()

    const text = template()
    expect(text).toContain('1.0')
    expect(text).toContain('Installed plugins')
    expect(text).toContain('(none)')
  })
})
