/*
 * Theme presets — the single user-facing "Theme" picker. Each preset
 * bundles a color palette (from `vuetify.js#THEME_OPTIONS`) with a
 * shape-language style (from `styles.js#STYLE_OPTIONS`) under a single
 * memorable name. Picking "Cyber Ligoj" is one click; under the hood
 * we switch the Vuetify theme to `ligojDark` AND set
 * `<html data-style="neon">`.
 *
 * Compact mode is orthogonal — see `applyCompact()` in `styles.js`.
 * It can be toggled on top of any preset, so "Solarized Press + Compact"
 * is a valid combination without exploding the catalog.
 *
 * Adding a new preset is one entry below. Use kebab-case for `id`
 * (persisted to localStorage), reuse existing theme/style ids, and
 * pick three colors for the swatch that read well at the tile size.
 */

import { applyStyle } from './styles.js'

const STORAGE_KEY = 'ligoj-preset'

/**
 * Catalog. Order is the picker order: light/classic at the top,
 * gradually drifting toward the louder + experimental presets so the
 * grid reads top-down by intensity.
 */
export const PRESET_OPTIONS = [
  /* --- classic / faithful --- */
  {
    id: 'ligoj-classic',
    label: 'Ligoj Classic',
    description: 'The original Ligoj light look — indigo + amber.',
    theme: 'ligojLight',
    style: 'default',
    dark: false,
    swatch: ['#1a237e', '#f57c00', '#fafafa'],
  },
  {
    id: 'ligoj-dark',
    label: 'Ligoj Dark',
    description: 'Ligoj palette on a dark canvas.',
    theme: 'ligojDark',
    style: 'default',
    dark: true,
    swatch: ['#5c6bc0', '#ffb74d', '#121212'],
  },
  {
    id: 'vscode-dark',
    label: 'VS Code Dark',
    description: 'The default VS Code Dark+ scheme on Vuetify shapes.',
    theme: 'vscodeDark',
    style: 'default',
    dark: true,
    swatch: ['#007acc', '#4ec9b0', '#1e1e1e'],
  },
  {
    id: 'monokai',
    label: 'Monokai',
    description: 'The Sublime / TextMate classic on stock Vuetify.',
    theme: 'monokai',
    style: 'default',
    dark: true,
    swatch: ['#66d9ef', '#f92672', '#272822'],
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Arctic, north-bluish palette on Vuetify shapes.',
    theme: 'nord',
    style: 'default',
    dark: true,
    swatch: ['#88c0d0', '#b48ead', '#2e3440'],
  },
  {
    id: 'darcula-classic',
    label: 'Darcula',
    description: 'JetBrains Darcula on stock Vuetify shapes.',
    theme: 'intellijDarcula',
    style: 'default',
    dark: true,
    swatch: ['#4f9eee', '#ffc66d', '#2b2b2b'],
  },

  /* --- 2026 bold combos --- */
  {
    id: 'pulse',
    label: 'Pulse',
    description: 'GitHub palette + Vibrant: gradient CTAs on a clean canvas.',
    theme: 'githubLight',
    style: 'vibrant',
    dark: false,
    swatch: ['#0969da', '#1a7f37', '#ffffff'],
  },
  {
    id: 'argon',
    label: 'Argon',
    description: 'Ligoj Light + Argon: gradient stat cards & pill buttons.',
    theme: 'ligojLight',
    style: 'argon',
    dark: false,
    swatch: [
      'linear-gradient(135deg, #5e72e4, #825ee4)',
      'linear-gradient(135deg, #11cdef, #1171ef)',
      '#f8f9fe',
    ],
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Ligoj Dark + Glass: frosted panels on an aurora gradient.',
    theme: 'ligojDark',
    style: 'glass',
    dark: true,
    swatch: [
      'linear-gradient(135deg, #14123a, #3a3a8e)',
      'linear-gradient(135deg, #6a82fb, #fc5c7d)',
      'rgba(255,255,255,0.2)',
    ],
  },
  {
    id: 'darcula-bento',
    label: 'Darcula Bento',
    description: 'IntelliJ Darcula in Apple-style oversized rounded cards.',
    theme: 'intellijDarcula',
    style: 'bento',
    dark: true,
    swatch: ['#4f9eee', '#cc7832', '#2b2b2b'],
  },

  /* --- design systems --- */
  {
    id: 'material-you',
    label: 'Material You',
    description: 'Material Design 3 — Roboto, rounded shapes, state-layer ripples, emphasized motion.',
    theme: 'md3Light',
    style: 'md3',
    dark: false,
    swatch: ['#6750a4', '#7d5260', '#eaddff'],
  },
  {
    id: 'material-you-dark',
    label: 'Material You Dark',
    description: 'Material Design 3 on a dark canvas.',
    theme: 'md3Dark',
    style: 'md3',
    dark: true,
    swatch: ['#d0bcff', '#efb8c8', '#141218'],
  },

  /* --- experimental / niche --- */
  {
    id: 'solarized-press',
    label: 'Solarized Press',
    description: 'Solarized Light + Sharp: brutalist editorial look.',
    theme: 'solarizedLight',
    style: 'sharp',
    dark: false,
    swatch: ['#268bd2', '#b58900', '#fdf6e3'],
  },
  {
    id: 'solarized-brutal',
    label: 'Solarized Brutal',
    description: 'Solarized Dark + Sharp: zero-radius, monospaced labels.',
    theme: 'solarizedDark',
    style: 'sharp',
    dark: true,
    swatch: ['#268bd2', '#b58900', '#002b36'],
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'GitHub palette + Paper: serif, hairline rules, no shadows.',
    theme: 'githubLight',
    style: 'paper',
    dark: false,
    swatch: ['#1a1a1a', '#c8442a', '#f3ede1'],
  },
  {
    id: 'cyber-ligoj',
    label: 'Cyber Ligoj',
    description: 'Ligoj Dark + Neon: glowing cyan & magenta on a black canvas.',
    theme: 'ligojDark',
    style: 'neon',
    dark: true,
    swatch: ['#05010f', '#00fff0', '#ff2bd6'],
  },
]

/** Default preset id used when storage holds an unknown / missing value. */
export const DEFAULT_PRESET_ID = 'ligoj-classic'

function lookup(id) {
  return PRESET_OPTIONS.find((p) => p.id === id)
}

/**
 * Resolve the preset id to load on boot. Falls back to the default
 * when storage is unavailable (SSR / private browsing) or holds an
 * unknown id (stale entry after a preset was renamed or removed).
 */
export function detectPreset() {
  if (typeof localStorage === 'undefined') return lookup(DEFAULT_PRESET_ID)
  return lookup(localStorage.getItem(STORAGE_KEY)) || lookup(DEFAULT_PRESET_ID)
}

export function persistPreset(id) {
  if (typeof localStorage === 'undefined') return
  if (lookup(id)) localStorage.setItem(STORAGE_KEY, id)
}

/**
 * Apply a preset. The Vuetify `themeApi` arg comes from `useTheme()`
 * — passed by the Profile view at click time. The boot path doesn't
 * have a live `themeApi` (Vuetify hasn't been instantiated yet) and
 * passes `null`; in that case we only flip the data-style attribute,
 * and Vuetify picks the right initial theme via
 * `createVuetify({ theme: { defaultTheme: getInitialThemeId() } })`.
 */
export function applyPreset(id, themeApi = null) {
  const preset = lookup(id) || lookup(DEFAULT_PRESET_ID)
  if (themeApi) themeApi.global.name.value = preset.theme
  applyStyle(preset.style)
  return preset
}

/**
 * Vuetify-instantiation helper. Reads the saved preset BEFORE Vuetify
 * exists so `createVuetify` gets the right `defaultTheme`. Inline
 * localStorage read — no Pinia, no Vue lifecycle dependency.
 */
export function getInitialThemeId() {
  return detectPreset().theme
}

/**
 * Boot path called from `main.js` before mount. Applies the style
 * side of the preset (the color side is already wired through
 * `getInitialThemeId()` → Vuetify's defaultTheme) and returns the
 * resolved preset so the caller can log / debug.
 */
export function bootPreset() {
  const preset = detectPreset()
  applyStyle(preset.style)
  return preset
}
