/*
 * Verifies the generic `editExtension` plugin hook of the entity create/edit
 * dialogs: contributed body components, replacement REST resource, target and
 * edition-mode awareness, graceful skip of non-contributing plugins and
 * lazy-load reactivity via the registry version.
 */
import { describe, it, expect, afterEach } from 'vitest'
import registry from '../../plugins/registry.js'
import { useEditExtensions } from '../../composables/useEditExtensions.js'

const FakeExtension = { name: 'FakeExtension', template: '<div />' }
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

describe('useEditExtensions', () => {
  it('defaults to no component and the given resource', () => {
    const { components, apiPath } = useEditExtensions('project', 'rest/project', () => ({ mode: 'create' }))
    expect(components.value).toEqual([])
    expect(apiPath.value).toBe('rest/project')
  })

  it('collects contributions and replaces the API path, passing target and context', () => {
    const seen = []
    register('test-edit-ext', {
      editExtension(ctx) {
        seen.push(ctx)
        return { component: FakeExtension, footer: FakeExtension, apiPath: 'rest/my-user' }
      },
    })
    const { components, footers, apiPath, context } = useEditExtensions('user', 'rest/service/id/user',
      () => ({ mode: 'edit', userId: 'alice' }))
    expect(components.value).toEqual([FakeExtension])
    expect(footers.value).toEqual([FakeExtension])
    expect(apiPath.value).toBe('rest/my-user')
    expect(seen.at(-1)).toEqual({ target: 'user', mode: 'edit', userId: 'alice' })
    expect(context.value.target).toBe('user')
  })

  it('lets a plugin opt out per target, skips plugins without the feature, accepts partial contributions', () => {
    register('test-no-feature', {})
    register('test-other-target', { editExtension: (ctx) => ctx.target === 'group' ? { apiPath: 'rest/x' } : null })
    register('test-api-only', { editExtension: () => ({ apiPath: 'rest/other-project' }) })
    const { components, footers, apiPath } = useEditExtensions('project', 'rest/project', () => ({ mode: 'create' }))
    expect(components.value).toEqual([])
    expect(footers.value).toEqual([])
    expect(apiPath.value).toBe('rest/other-project')
  })

  it('reacts to a plugin registered after the first read', () => {
    const { components } = useEditExtensions('company', 'rest/service/id/company', () => ({ mode: 'create' }))
    expect(components.value).toEqual([])
    register('test-late-ext', { editExtension: () => ({ component: FakeExtension }) })
    expect(components.value).toEqual([FakeExtension])
  })
})
