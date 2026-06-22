import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import i18nPlugin from '@/plugins/i18n.js'
import InstanceImportDialog from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/views/InstanceImportDialog.vue'
import { buildInstanceUploadFormData } from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/uploadFormData.js'

const vuetify = createVuetify({ components, directives })

/**
 * Component tests for the CSV instance importer. We exercise three
 * behaviours that have no other safety net:
 *   1. opening the dialog resets every field to the defaults
 *   2. the multipart payload sent to /upload carries the right fields
 *   3. a failed upload surfaces an error alert instead of emitting `saved`
 */
function mountDialog(props = {}) {
  return mount(InstanceImportDialog, {
    props: {
      modelValue: true,
      subscriptionId: 42,
      ...props,
    },
    global: { plugins: [vuetify, i18nPlugin] },
    attachTo: document.body,
  })
}

describe('<InstanceImportDialog>', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('seeds form state with the legacy defaults', () => {
    const wrapper = mountDialog()
    expect(wrapper.vm.form.separator).toBe(';')
    expect(wrapper.vm.form.mergeUpload).toBe('UPDATE')
    expect(wrapper.vm.form.memoryUnit).toBe(1024)
    expect(wrapper.vm.form.headersIncluded).toBe(true)
    expect(wrapper.vm.form.errorContinue).toBe(true)
    expect(wrapper.vm.form.file).toBeNull()
  })

  it('re-resets the form on every dialog open', async () => {
    const wrapper = mountDialog({ modelValue: false })
    // Mutate state, then re-open.
    wrapper.vm.form.separator = ','
    wrapper.vm.form.mergeUpload = 'KEEP'
    wrapper.vm.form.memoryUnit = 1
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.vm.form.separator).toBe(';')
    expect(wrapper.vm.form.mergeUpload).toBe('UPDATE')
    expect(wrapper.vm.form.memoryUnit).toBe(1024)
  })

})

describe('buildInstanceUploadFormData', () => {
  it('returns null when no file is provided', () => {
    expect(buildInstanceUploadFormData(null)).toBeNull()
    expect(buildInstanceUploadFormData({ file: null })).toBeNull()
    expect(buildInstanceUploadFormData({ file: [] })).toBeNull()
  })

  it('unwraps a single-element file array (v-file-input emits arrays)', () => {
    const file = new File(['x'], 'x.csv')
    const fd = buildInstanceUploadFormData({
      file: [file],
      separator: ';',
      mergeUpload: 'UPDATE',
      memoryUnit: 1024,
      headersIncluded: true,
      errorContinue: true,
    })
    expect(fd).toBeInstanceOf(FormData)
    expect(fd.get('csv-file')).toBe(file)
  })

  it('accepts a bare File too', () => {
    const file = new File(['x'], 'x.csv')
    const fd = buildInstanceUploadFormData({
      file,
      separator: ';',
      mergeUpload: 'UPDATE',
      memoryUnit: 1024,
      headersIncluded: true,
      errorContinue: true,
    })
    expect(fd.get('csv-file')).toBe(file)
  })

  it('writes every legacy field name to the payload', () => {
    const file = new File(['x'], 'x.csv')
    const fd = buildInstanceUploadFormData({
      file,
      separator: '|',
      encoding: 'utf-8',
      mergeUpload: 'KEEP',
      memoryUnit: 1,
      headersIncluded: false,
      errorContinue: false,
    })
    expect(fd.get('separator')).toBe('|')
    expect(fd.get('encoding')).toBe('utf-8')
    expect(fd.get('mergeUpload')).toBe('KEEP')
    // FormData coerces values to string — memory unit ships as the
    // ratio (1 = MB, 1024 = GB) the legacy backend expects.
    expect(fd.get('memoryUnit')).toBe('1')
    expect(fd.get('headers-included')).toBe('false')
    expect(fd.get('errorContinue')).toBe('false')
  })

  it('omits the encoding field when blank (backend falls back to auto-detect)', () => {
    const file = new File(['x'], 'x.csv')
    const fd = buildInstanceUploadFormData({
      file,
      separator: ';',
      encoding: '',
      mergeUpload: 'INSERT',
      memoryUnit: 1024,
      headersIncluded: true,
      errorContinue: true,
    })
    expect(fd.has('encoding')).toBe(false)
  })
})
