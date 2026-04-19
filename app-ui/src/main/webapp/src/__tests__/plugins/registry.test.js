import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import registry from '@/plugins/registry.js'

describe('Plugin Registry', () => {
  const registeredIds = []

  afterEach(() => {
    registeredIds.forEach(id => registry.remove(id))
    registeredIds.length = 0
  })

  it('register() with valid definition returns true and get() returns it', () => {
    const definition = {
      id: 'test-plugin',
      install: vi.fn(),
      label: 'Test Plugin',
      component: {},
      routes: [{ path: '/test' }],
      meta: { version: '1.0' }
    }

    const result = registry.register('test-plugin', definition)
    registeredIds.push('test-plugin')

    expect(result).toBe(true)
    const plugin = registry.get('test-plugin')
    expect(plugin).toEqual({
      id: 'test-plugin',
      label: 'Test Plugin',
      component: {},
      routes: [{ path: '/test' }],
      install: definition.install,
      feature: null,
      service: null,
      meta: { version: '1.0' }
    })
  })

  it('register() missing id field returns false', () => {
    const definition = {
      install: vi.fn()
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = registry.register('no-id', definition)

    expect(result).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('Plugin "no-id" is missing required field: id')
    consoleSpy.mockRestore()
  })

  it('register() missing install field returns false', () => {
    const definition = {
      id: 'no-install'
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = registry.register('no-install', definition)

    expect(result).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('Plugin "no-install" is missing required field: install')
    consoleSpy.mockRestore()
  })

  it('has() returns true/false correctly', () => {
    const definition = {
      id: 'exists',
      install: vi.fn()
    }

    registry.register('exists', definition)
    registeredIds.push('exists')

    expect(registry.has('exists')).toBe(true)
    expect(registry.has('does-not-exist')).toBe(false)
  })

  it('list() returns all registered plugins', () => {
    const def1 = { id: 'plugin1', install: vi.fn() }
    const def2 = { id: 'plugin2', install: vi.fn() }

    registry.register('plugin1', def1)
    registry.register('plugin2', def2)
    registeredIds.push('plugin1', 'plugin2')

    const list = registry.list()
    expect(list).toHaveLength(2)
    expect(list.find(p => p.id === 'plugin1')).toBeDefined()
    expect(list.find(p => p.id === 'plugin2')).toBeDefined()
  })

  it('remove() deletes a plugin and has() returns false', () => {
    const definition = {
      id: 'to-remove',
      install: vi.fn()
    }

    registry.register('to-remove', definition)
    expect(registry.has('to-remove')).toBe(true)

    const removed = registry.remove('to-remove')
    expect(removed).toBe(true)
    expect(registry.has('to-remove')).toBe(false)
  })

  it('register() uses fallback label from name then id', () => {
    const defWithName = {
      id: 'with-name',
      install: vi.fn(),
      name: 'Name Field'
    }

    registry.register('with-name', defWithName)
    registeredIds.push('with-name')
    expect(registry.get('with-name').label).toBe('Name Field')

    const defWithoutLabel = {
      id: 'no-label',
      install: vi.fn()
    }

    registry.register('no-label', defWithoutLabel)
    registeredIds.push('no-label')
    expect(registry.get('no-label').label).toBe('no-label')
  })

  it('register() defaults component to null and meta to {}', () => {
    const definition = {
      id: 'defaults',
      install: vi.fn()
    }

    registry.register('defaults', definition)
    registeredIds.push('defaults')

    const plugin = registry.get('defaults')
    expect(plugin.component).toBeNull()
    expect(plugin.meta).toEqual({})
    expect(plugin.routes).toEqual([])
  })
})
