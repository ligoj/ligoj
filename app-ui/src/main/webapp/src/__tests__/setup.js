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

// jsdom lacks ResizeObserver; Vuetify's data-table / pagination call it on
// mount. A minimal no-op stub is enough for rendering to succeed in tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
// IntersectionObserver is also absent and used by some Vuetify components.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
}
// visualViewport is referenced by Vuetify's `VOverlay` location
// strategies (v-dialog, v-menu, v-tooltip). jsdom doesn't ship one
// so we provide an inert stub that satisfies the property reads
// Vuetify performs at mount time.
if (typeof window !== 'undefined' && !window.visualViewport) {
  Object.defineProperty(window, 'visualViewport', {
    writable: true,
    value: {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return true },
    },
  })
}
