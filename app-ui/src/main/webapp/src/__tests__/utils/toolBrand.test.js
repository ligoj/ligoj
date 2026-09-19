import { describe, it, expect, vi, beforeEach } from 'vitest'
import { svgBrandColor, fallbackToolColor, resolveToolColor, toolIconBase, isToolAvailable, _resetToolColorCache } from '@/utils/toolBrand.js'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'

// Colour sets of real plugin icons (attributes as shipped in the SVG files).
const COGNITO = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 96 96"><path fill="url(#a)" d="M95 1H1v94h94V1Z"/><path fill="#ffffff" d="M20 43h16v-2H20z"/>'
  + '<defs><linearGradient id="a" x1="0" x2="1"><stop stop-color="#ff5252"/><stop offset="1" stop-color="#bd0816"/></linearGradient></defs></svg>'
const JIRA = '<svg viewBox="0 0 256 256"><path fill="#2684FF" d="M1"/><path fill="#2684FF" d="M2"/><path fill="url(#g)" d="M3"/><defs><linearGradient id="g"><stop stop-color="#0052CC"/><stop offset="1" stop-color="#2684FF"/></linearGradient></defs></svg>'
const JENKINS = '<svg viewBox="0 0 256 417"><path fill="#fff" d="M1"/><path fill="#d33833" d="M2"/><path fill="#dcd9d8" d="M3"/><path fill="#231f20" d="M4"/><path style="fill:#d33833;stroke:#231f20" d="M5"/></svg>'
const AZURE = '<svg viewBox="0 0 96 96"><path fill="#114a8b"/><path fill="#0669bc"/><path fill="#2892df"/><path fill="#3ccbf4"/></svg>'
const AWS = '<svg viewBox="0 0 256 153"><path fill="#252F3E"/><path fill="#F90"/></svg>'

describe('svgBrandColor()', () => {
  it('picks the saturated, mid-lightness brand colour, ignoring white and neutral greys', () => {
    expect(svgBrandColor(COGNITO)).toBe('#bd0816')
    expect(svgBrandColor(JIRA)).toBe('#0052cc')
    expect(svgBrandColor(JENKINS)).toBe('#d33833')
    expect(svgBrandColor(AZURE)).toBe('#0669bc')
    expect(svgBrandColor(AWS)).toBe('#ff9900')
  })

  it('returns null when the icon carries no usable colour', () => {
    expect(svgBrandColor('<svg><path fill="#000000"/><path fill="#fff"/><path fill="none"/></svg>')).toBeNull()
    expect(svgBrandColor('<svg><path d="M0 0"/></svg>')).toBeNull()
    expect(svgBrandColor('')).toBeNull()
    expect(svgBrandColor(null)).toBeNull()
  })
})

describe('fallbackToolColor()', () => {
  it('returns the known brand colour for a known tool name, else a stable palette colour', () => {
    expect(fallbackToolColor('Jira')).toBe('#2563eb')
    expect(fallbackToolColor('Jenkins')).toBe('#d33833')
    const c = fallbackToolColor('Some unknown tool')
    expect(c).toMatch(/^#[0-9a-f]{6}$/)
    expect(fallbackToolColor('Some unknown tool')).toBe(c)
    expect(fallbackToolColor('')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('resolveToolColor()', () => {
  beforeEach(() => { _resetToolColorCache() })

  it('derives the colour from the tool SVG, fetched once per tool', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => COGNITO }))
    expect(toolIconBase('service:id:cognito:saas')).toMatch(/main\/service\/id\/cognito\/img\/cognito$/)
    expect(await resolveToolColor({ id: 'service:id:cognito', name: 'AWS Cognito' })).toBe('#bd0816')
    expect(await resolveToolColor({ id: 'service:id:cognito:saas', name: 'AWS Cognito' })).toBe('#bd0816')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch.mock.calls[0][0]).toMatch(/main\/service\/id\/cognito\/img\/cognito\.svg$/)
  })

  it('never fetches the SVG of an unavailable plug-in and uses the name colour', async () => {
    globalThis.fetch = vi.fn()
    const color = await resolveToolColor({ id: 'service:scm:gitlab:local', name: 'GitLab', enabled: false })
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(color).toBe(fallbackToolColor('GitLab'))
  })

  it('knows a tool is unavailable from the node flag or from the session plug-ins', () => {
    setActivePinia(createPinia())
    expect(isToolAvailable('service:prov:azure:local')).toBe(true) // no session yet: unknown counts as available
    useAuthStore().session = { applicationSettings: { plugins: ['service:build:jenkins'] } }
    expect(isToolAvailable('service:build:jenkins:local')).toBe(true)
    expect(isToolAvailable('service:prov:azure')).toBe(false)
    expect(isToolAvailable({ id: 'service:build:jenkins:local', enabled: false })).toBe(false)
    expect(isToolAvailable('service:build')).toBe(true) // service level: no icon file involved
  })

  it('falls back to the name colour when the SVG is missing, unparsable or the node is not a tool', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, text: async () => '' }))
    expect(await resolveToolColor({ id: 'service:build:jenkins', name: 'Jenkins' })).toBe('#d33833')
    expect(await resolveToolColor({ id: 'service:id', name: 'Identity' })).toBe(fallbackToolColor('Identity'))
    globalThis.fetch = vi.fn(async () => { throw new Error('network') })
    expect(await resolveToolColor({ id: 'service:km:confluence', name: 'Confluence' })).toBe('#e6a019')
  })
})
