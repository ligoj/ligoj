import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRESET_OPTIONS, detectPreset, DEFAULT_PRESET_ID } from '@/plugins/presets.js'
import { STYLE_OPTIONS } from '@/plugins/styles.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('PRESET_OPTIONS', () => {
  it('contains the required couples the user specified', () => {
    /**
     * Acceptance list — the original user request. Each row is (theme,
     * style). The test passes if the catalog still has a preset for
     * every couple; we don't pin the *labels* so future renames don't
     * break the contract.
     */
    const required = [
      ['ligojLight',      'default'], // Ligoj Light + Vuetify
      ['vscodeDark',      'default'], // VS Code Dark+ + Vuetify
      ['solarizedLight',  'sharp'],   // Solarized Light + Sharp
      ['solarizedDark',   'sharp'],   // Solarized Dark + Sharp
      ['ligojDark',       'neon'],    // Ligoj Dark + Neon
    ]
    for (const [theme, style] of required) {
      expect(
        PRESET_OPTIONS.some((p) => p.theme === theme && p.style === style),
        `Missing preset for (${theme} + ${style})`,
      ).toBe(true)
    }
  })

  it('every preset.style points at a valid STYLE_OPTIONS id', () => {
    const styleIds = new Set(STYLE_OPTIONS.map((s) => s.id))
    for (const p of PRESET_OPTIONS) {
      expect(styleIds.has(p.style), `Unknown style "${p.style}" in preset "${p.id}"`).toBe(true)
    }
  })

  it('no preset uses the retired "compact" style id (compact is now a global toggle)', () => {
    expect(PRESET_OPTIONS.every((p) => p.style !== 'compact')).toBe(true)
  })

  it('ids are unique', () => {
    const ids = PRESET_OPTIONS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('PRESET_TO_THEME in vuetify.js mirrors PRESET_OPTIONS', () => {
    // vuetify.js carries an inline copy of the (preset → theme) map
    // because it has to resolve the initial theme BEFORE Vue / Pinia
    // boot. This test guards against drift: if you add a preset and
    // forget to mirror it there, vuetify will fall back to the legacy
    // theme key and the first paint will be wrong.
    const vuetifyPath = path.resolve(__dirname, '../../plugins/vuetify.js')
    const src = fs.readFileSync(vuetifyPath, 'utf8')
    for (const preset of PRESET_OPTIONS) {
      const re = new RegExp(`'${preset.id}'\\s*:\\s*'${preset.theme}'`)
      expect(re.test(src), `vuetify.js#PRESET_TO_THEME is missing or wrong for "${preset.id}"`).toBe(true)
    }
  })

  it('ships the "Reforged" preset (reforged) wired to ligojClassic + ligoj-classic style', () => {
    const p = PRESET_OPTIONS.find((x) => x.id === 'reforged')
    expect(p, 'preset reforged is missing').toBeTruthy()
    expect(p.theme).toBe('ligojClassic')
    expect(p.style).toBe('ligoj-classic')
    // The style must exist in the catalog, else applyStyle() rejects it.
    expect(STYLE_OPTIONS.some((s) => s.id === 'ligoj-classic')).toBe(true)
  })

  it('keeps the default preset (ligoj-classic) on ligojLight + default style, now labelled "Ligoj"', () => {
    const def = PRESET_OPTIONS.find((x) => x.id === DEFAULT_PRESET_ID)
    expect(def.id).toBe('ligoj-classic')
    expect(def.label).toBe('Ligoj')
    expect(def.theme).toBe('ligojLight')
    expect(def.style).toBe('default')
  })

  it('detectPreset returns the default when storage is empty', () => {
    // Vitest provides happy-dom by default, so localStorage exists.
    localStorage.removeItem('ligoj-preset')
    expect(detectPreset().id).toBe(DEFAULT_PRESET_ID)
  })

  it('detectPreset falls back to the default for an unknown stored id', () => {
    localStorage.setItem('ligoj-preset', 'not-a-real-preset')
    expect(detectPreset().id).toBe(DEFAULT_PRESET_ID)
    localStorage.removeItem('ligoj-preset')
  })
})
