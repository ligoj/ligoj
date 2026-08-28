/*
 * Verifies the generic `actionExtension` plugin hook of the view toolbars:
 * contributed action components, target and context awareness, graceful skip
 * of non-contributing plugins and lazy-load reactivity via the registry version.
 */
import { describe, it, expect, afterEach } from 'vitest'
import registry from '../../plugins/registry.js'
import { useActionExtensions } from '../../composables/useActionExtensions.js'

const FakeAction = { name: 'FakeAction', props: ['context'], template: '<button />' }
const registered = []

function register(id, features) {
  registry.register(id, {
    id,
    install() { /* no-op */ },
    feature(action, ...args) {
      const fn = features[action]
      if (!fn) throw new Error(`Plugin "${id}" has no feature "${action}"`)
      return fn(...args)
    },
  })
  registered.push(id)
}

afterEach(() => {
  registered.splice(0).forEach((id) => registry.remove(id))
})

describe('useActionExtensions', () => {
  it('defaults to no action', () => {
    const { actions, context } = useActionExtensions('user', () => ({ selected: [] }))
    expect(actions.value).toEqual([])
    expect(context.value).toEqual({ target: 'user', selected: [] })
  })

  it('collects the contributed action components, passing target and context', () => {
    const seen = []
    register('test-action-ext', {
      actionExtension(ctx) {
        seen.push(ctx)
        return { action: FakeAction }
      },
    })
    const { actions, context } = useActionExtensions('prov-quote', () => ({ subscriptionId: '12' }))
    expect(actions.value).toEqual([FakeAction])
    expect(seen.at(-1)).toEqual({ target: 'prov-quote', subscriptionId: '12' })
    expect(context.value.target).toBe('prov-quote')
  })

  it('lets a plugin opt out per target and skips plugins without the feature or without action', () => {
    register('test-no-feature', {})
    register('test-other-target', { actionExtension: (ctx) => ctx.target === 'group' ? { action: FakeAction } : null })
    register('test-empty', { actionExtension: () => ({}) })
    const { actions } = useActionExtensions('user', () => ({}))
    expect(actions.value).toEqual([])
  })

  it('reacts to a plugin registered after the first read', () => {
    const { actions } = useActionExtensions('company', () => ({}))
    expect(actions.value).toEqual([])
    register('test-late-action', { actionExtension: () => ({ action: FakeAction }) })
    expect(actions.value).toEqual([FakeAction])
  })
})
