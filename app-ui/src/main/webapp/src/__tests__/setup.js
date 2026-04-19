// Global test setup
import { vi } from 'vitest'

// Mock fetch globally
globalThis.fetch = vi.fn()

// Mock document.title
Object.defineProperty(document, 'title', {
  writable: true,
  value: '',
})
