import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LjStatus from '@/components/LjStatus.vue'

// v-tooltip is a global Vuetify component; stub it so we only assert the dot.
function render(props) {
  return mount(LjStatus, {
    props: { tooltip: 'status', ...props },
    global: { stubs: { 'v-tooltip': true } },
  })
}

describe('<LjStatus />', () => {
  describe('semantic `status` prop', () => {
    for (const status of ['ok', 'warn', 'error', 'idle']) {
      it(`status='${status}' → class lj-status--${status}`, () => {
        const w = render({ status })
        expect(w.classes()).toContain(`lj-status--${status}`)
      })
    }
  })

  describe('binary `active` shortcut', () => {
    it('active=true (no status) → lj-status--ok', () => {
      const w = render({ active: true })
      expect(w.classes()).toContain('lj-status--ok')
    })

    it('active=false (no status) → lj-status--idle', () => {
      const w = render({ active: false })
      expect(w.classes()).toContain('lj-status--idle')
    })

    it('defaults to idle when neither prop is set', () => {
      const w = render({})
      expect(w.classes()).toContain('lj-status--idle')
    })
  })

  describe('precedence', () => {
    it('status overrides active', () => {
      const w = render({ active: true, status: 'error' })
      expect(w.classes()).toContain('lj-status--error')
      expect(w.classes()).not.toContain('lj-status--ok')
    })

    it('reacts to prop changes', async () => {
      const w = render({ status: 'ok' })
      expect(w.classes()).toContain('lj-status--ok')
      await w.setProps({ status: 'warn' })
      expect(w.classes()).toContain('lj-status--warn')
    })
  })

  it('exposes the tooltip as the aria-label', () => {
    const w = render({ status: 'ok', tooltip: 'Activated' })
    expect(w.attributes('aria-label')).toBe('Activated')
    expect(w.attributes('role')).toBe('img')
  })
})
