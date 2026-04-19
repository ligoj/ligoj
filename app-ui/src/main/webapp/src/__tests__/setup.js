// Global test setup
import { vi, beforeEach } from 'vitest'

// Mock fetch globally
globalThis.fetch = vi.fn()

// Mock document.title
Object.defineProperty(document, 'title', {
  writable: true,
  value: '',
})

// jsdom ships a non-functional localStorage shim under Vitest; swap in a
// real Map-backed implementation so stores that persist preferences work.
const storage = new Map()
const localStorageMock = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => { storage.set(key, String(value)) },
  removeItem: (key) => { storage.delete(key) },
  clear: () => { storage.clear() },
  key: (i) => Array.from(storage.keys())[i] ?? null,
  get length() { return storage.size },
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
beforeEach(() => { storage.clear() })
