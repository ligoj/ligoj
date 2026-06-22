import { describe, it, expect, beforeEach } from 'vitest'
import {
  detectReduceMotion,
  persistReduceMotion,
  applyReduceMotion,
  bootReduceMotion,
} from '@/plugins/styles.js'

const KEY = 'ligoj-reduce-motion'

describe('reduce-motion toggle', () => {
  beforeEach(() => {
    // Vitest provides happy-dom: localStorage + document exist.
    localStorage.removeItem(KEY)
    delete document.documentElement.dataset.reduceMotion
  })

  it('detect defaults to false when storage is empty', () => {
    expect(detectReduceMotion()).toBe(false)
  })

  it('detect reads true only for the exact "true" string', () => {
    localStorage.setItem(KEY, 'true')
    expect(detectReduceMotion()).toBe(true)
    localStorage.setItem(KEY, 'false')
    expect(detectReduceMotion()).toBe(false)
  })

  it('persist writes "true"/"false" mirroring the boolean', () => {
    persistReduceMotion(true)
    expect(localStorage.getItem(KEY)).toBe('true')
    persistReduceMotion(false)
    expect(localStorage.getItem(KEY)).toBe('false')
  })

  it('apply sets the html data attribute and removes it when off', () => {
    applyReduceMotion(true)
    expect(document.documentElement.dataset.reduceMotion).toBe('true')
    applyReduceMotion(false)
    expect(document.documentElement.dataset.reduceMotion).toBeUndefined()
  })

  it('boot reads storage, applies it, and returns the value', () => {
    localStorage.setItem(KEY, 'true')
    expect(bootReduceMotion()).toBe(true)
    expect(document.documentElement.dataset.reduceMotion).toBe('true')
  })
})
