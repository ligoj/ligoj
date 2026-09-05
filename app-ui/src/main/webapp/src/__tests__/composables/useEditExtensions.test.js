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

  it('prepare() passes the payload through untouched without beforeSave contributor', async () => {
    register('plain', { editExtension: () => ({ component: FakeExtension }) })
    const { prepare } = useEditExtensions('project', 'rest/project', () => ({ mode: 'create' }))
    const payload = { name: 'p' }
    expect(await prepare(payload)).toBe(payload)
  })

  it('prepare() chains the beforeSave hooks in order, sync or async, mutation or replacement', async () => {
    register('first', { editExtension: () => ({ beforeSave: (p) => ({ ...p, a: 1 }) }) })
    // Async hook, sees the previous result
    register('second', { editExtension: () => ({ beforeSave: async (p, ctx) => ({ ...p, b: p.a + 1, target: ctx.target }) }) })
    // In-place mutation returning nothing keeps the current payload
    register('third', { editExtension: () => ({ beforeSave: (p) => { p.c = 3 } }) })
    const { prepare } = useEditExtensions('project', 'rest/project', () => ({ mode: 'edit' }))
    expect(await prepare({ name: 'p' })).toEqual({ name: 'p', a: 1, b: 2, target: 'project', c: 3 })
  })

  it('prepare() returns false as soon as a hook aborts, skipping the following hooks', async () => {
    register('abort', { editExtension: () => ({ beforeSave: () => false }) })
    let called = false
    register('after', { editExtension: () => ({ beforeSave: () => { called = true } }) })
    const { prepare } = useEditExtensions('project', 'rest/project', () => ({ mode: 'edit' }))
    expect(await prepare({ name: 'p' })).toBe(false)
    expect(called).toBe(false)
  })

  it('reacts to a plugin registered after the first read', () => {
    const { components } = useEditExtensions('company', 'rest/service/id/company', () => ({ mode: 'create' }))
    expect(components.value).toEqual([])
    register('test-late-ext', { editExtension: () => ({ component: FakeExtension }) })
    expect(components.value).toEqual([FakeExtension])
  })
})
