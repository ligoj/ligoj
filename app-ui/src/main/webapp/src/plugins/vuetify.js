import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { en, fr } from 'vuetify/locale'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
// Self-hosted webfonts via @fontsource (npm) — the woff2 live in node_modules
// (gitignored) and Vite bundles them locally at build time, so there is NO
// external fonts.googleapis.com / fonts.gstatic.com reference AND no font binary
// is committed to the repo. We import only the subsets the UI needs (latin /
// latin-ext / vietnamese); each weight's woff2 is still fetched lazily by the
// browser when that weight is actually rendered.
//
// Bricolage Grotesque — the UI font (weights 600/700/800).
import '@fontsource/bricolage-grotesque/latin-600.css'
import '@fontsource/bricolage-grotesque/latin-700.css'
import '@fontsource/bricolage-grotesque/latin-800.css'
import '@fontsource/bricolage-grotesque/latin-ext-600.css'
import '@fontsource/bricolage-grotesque/latin-ext-700.css'
import '@fontsource/bricolage-grotesque/latin-ext-800.css'
import '@fontsource/bricolage-grotesque/vietnamese-600.css'
import '@fontsource/bricolage-grotesque/vietnamese-700.css'
import '@fontsource/bricolage-grotesque/vietnamese-800.css'
// Roboto — the Material Design 3 style font (weights 400/500/700).
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/latin-ext-400.css'
import '@fontsource/roboto/latin-ext-500.css'
import '@fontsource/roboto/latin-ext-700.css'
import '@fontsource/roboto/vietnamese-400.css'
import '@fontsource/roboto/vietnamese-500.css'
import '@fontsource/roboto/vietnamese-700.css'
// Project-wide Vuetify CSS tweaks (imported after `vuetify/styles` so
// our rules win the cascade).
import '@/assets/vuetify-overrides.css'

/* -----------------------------------------------------------------------
 * Theme catalog
 *
 * Each entry is a Vuetify theme definition: `dark` flag plus `colors` for
 * the standard semantic slots (primary/secondary/accent + error/warning
 * /info/success + background/surface). Palettes are inspired by the
 * named editor / design tools listed alongside each block; we don't
 * reproduce them pixel-perfect, just pick a fitting subset for Vuetify's
 * semantic slots.
 * --------------------------------------------------------------------- */

const ligojLight = {
  dark: false,
  colors: {
    primary: '#1a237e',
    secondary: '#f57c00',
    accent: '#0d47a1',
    error: '#c62828',
    warning: '#f9a825',
    info: '#0277bd',
    success: '#2e7d32',
    background: '#fafafa',
    surface: '#ffffff',
  },
}

const ligojDark = {
  dark: true,
  colors: {
    primary: '#5c6bc0',
    secondary: '#ffb74d',
    accent: '#42a5f5',
    error: '#ef5350',
    warning: '#fdd835',
    info: '#29b6f6',
    success: '#66bb6a',
    background: '#121212',
    surface: '#1e1e1e',
  },
}

// Solarized Light — Ethan Schoonover, base03 → base3.
const solarizedLight = {
  dark: false,
  colors: {
    primary: '#268bd2',
    secondary: '#2aa198',
    accent: '#6c71c4',
    error: '#dc322f',
    warning: '#b58900',
    info: '#268bd2',
    success: '#859900',
    background: '#fdf6e3',
    surface: '#eee8d5',
  },
}

// Solarized Dark — same hue family on dark base.
const solarizedDark = {
  dark: true,
  colors: {
    primary: '#268bd2',
    secondary: '#2aa198',
    accent: '#6c71c4',
    error: '#dc322f',
    warning: '#b58900',
    info: '#268bd2',
    success: '#859900',
    background: '#002b36',
    surface: '#073642',
  },
}

// GitHub Light — based on Primer's color tokens.
const githubLight = {
  dark: false,
  colors: {
    primary: '#0969da',
    secondary: '#6e7781',
    accent: '#8250df',
    error: '#cf222e',
    warning: '#9a6700',
    info: '#0969da',
    success: '#1a7f37',
    background: '#ffffff',
    surface: '#f6f8fa',
  },
}

// VS Code Dark+ — the VS Code default dark theme.
const vscodeDark = {
  dark: true,
  colors: {
    primary: '#007acc',
    secondary: '#569cd6',
    accent: '#4ec9b0',
    error: '#f44747',
    warning: '#dcdcaa',
    info: '#9cdcfe',
    success: '#4ec9b0',
    background: '#1e1e1e',
    surface: '#252526',
  },
}

// IntelliJ Light — JetBrains' default light scheme.
const intellijLight = {
  dark: false,
  colors: {
    primary: '#4a86e8',
    secondary: '#6f9eb3',
    accent: '#6e3a8e',
    error: '#d80000',
    warning: '#b08000',
    info: '#4a86e8',
    success: '#008000',
    background: '#ffffff',
    surface: '#f2f2f2',
  },
}

// One Dark — Atom's signature scheme (now used by many editors).
const oneDark = {
  dark: true,
  colors: {
    primary: '#61afef',
    secondary: '#c678dd',
    accent: '#56b6c2',
    error: '#e06c75',
    warning: '#e5c07b',
    info: '#61afef',
    success: '#98c379',
    background: '#282c34',
    surface: '#21252b',
  },
}

/*
 * Material Design 3 (Material You) baseline palettes. Primary/secondary/
 * tertiary follow the MD3 baseline tonal scheme (the purple "Material You"
 * default); error/warning/info/success map MD3's semantic tones onto
 * Vuetify's extra slots. Paired with the `md3` shape style (Roboto, rounded
 * corners, state-layer ripples, emphasized motion) in `styles.js`.
 */
const md3Light = {
  dark: false,
  colors: {
    primary: '#6750a4',
    secondary: '#625b71',
    accent: '#7d5260',
    error: '#b3261e',
    warning: '#9a6700',
    info: '#00639b',
    success: '#2e6a4f',
    background: '#fef7ff',
    surface: '#fef7ff',
  },
}

const md3Dark = {
  dark: true,
  colors: {
    primary: '#d0bcff',
    secondary: '#ccc2dc',
    accent: '#efb8c8',
    // MD3's dark error tone (#f2b8b5) is a light pink meant for error TEXT;
    // Ligoj uses `error` as a solid danger-button background with white text,
    // so use a saturated red that stays readable under white labels.
    error: '#d32f2f',
    warning: '#e9c46a',
    info: '#9ecaff',
    success: '#7fd0a6',
    background: '#141218',
    surface: '#141218',
  },
}

// Ligoj Classic — faithful revival of the legacy Bootstrap + Material Design
// skin (themes/bootstrap-material-design): purple primary, teal accents,
// indigo toolbar. Paired with the `ligoj-classic` shape style in `styles.js`
// (ripples + modal scale-in).
const ligojClassic = {
  dark: false,
  colors: {
    primary: '#9c27b0',
    secondary: '#0aa89e',
    accent: '#3f51b5',
    error: '#f44336',
    warning: '#ff9800',
    info: '#039588',
    success: '#4cae51',
    background: '#fafafa',
    surface: '#ffffff',
  },
}

const themes = {
  ligojLight,
  ligojDark,
  ligojClassic,
  solarizedLight,
  solarizedDark,
  githubLight,
  vscodeDark,
  intellijLight,
  oneDark,
  md3Light,
  md3Dark,
}

/**
 * Public theme catalog — a UI-friendly array used by Settings/Profile
 * to render selectors. `swatch` lists three colors picked from the
 * theme's palette so a tile can preview the look at a glance.
 */
export const THEME_OPTIONS = [
  { id: 'ligojLight',      label: 'Ligoj Light',      dark: false, swatch: ['#1a237e', '#f57c00', '#fafafa'] },
  { id: 'ligojDark',       label: 'Ligoj Dark',       dark: true,  swatch: ['#5c6bc0', '#ffb74d', '#121212'] },
  { id: 'ligojClassic',    label: 'Reforged',         dark: false, swatch: ['#9c27b0', '#0aa89e', '#3f51b5'] },
  { id: 'solarizedLight',  label: 'Solarized Light',  dark: false, swatch: ['#268bd2', '#b58900', '#fdf6e3'] },
  { id: 'solarizedDark',   label: 'Solarized Dark',   dark: true,  swatch: ['#268bd2', '#b58900', '#002b36'] },
  { id: 'githubLight',     label: 'GitHub Light',     dark: false, swatch: ['#0969da', '#1a7f37', '#ffffff'] },
  { id: 'vscodeDark',      label: 'VS Code Dark+',    dark: true,  swatch: ['#007acc', '#4ec9b0', '#1e1e1e'] },
  { id: 'intellijLight',   label: 'IntelliJ Light',   dark: false, swatch: ['#4a86e8', '#008000', '#ffffff'] },
  { id: 'oneDark',         label: 'One Dark',         dark: true,  swatch: ['#61afef', '#c678dd', '#282c34'] },
  { id: 'md3Light',        label: 'Material You',     dark: false, swatch: ['#6750a4', '#7d5260', '#eaddff'] },
  { id: 'md3Dark',         label: 'Material You Dark', dark: true, swatch: ['#d0bcff', '#efb8c8', '#141218'] },
]

/**
 * Initial theme id for `createVuetify`. The single source of truth is
 * now `plugins/presets.js` — the user picks a Theme PRESET (a named
 * palette + shape combo) and we derive the Vuetify theme id from it
 * here. Done with an inline localStorage read instead of importing
 * presets.js to keep this file dependency-free (presets.js imports
 * styles.js but not vuetify.js — keeping it that way avoids a cycle).
 */
function detectTheme() {
  if (typeof localStorage === 'undefined') return 'ligojLight'
  // New: read from the unified preset key first.
  const presetId = localStorage.getItem('ligoj-preset')
  if (presetId) {
    const themeId = PRESET_TO_THEME[presetId]
    if (themeId && themes[themeId]) return themeId
  }
  // Legacy fallback: the old "ligoj-theme" key from before presets
  // existed. Honoured so users who customised on the previous version
  // don't get reset on upgrade.
  const stored = localStorage.getItem('ligoj-theme')
  return themes[stored] ? stored : 'ligojLight'
}

/**
 * Tiny duplication of the preset → theme mapping that lives canonically
 * in `presets.js#PRESET_OPTIONS`. Kept inline so `detectTheme()` can
 * resolve the saved preset BEFORE Vuetify (and therefore Vue) exists,
 * without importing presets.js (which would create a circular import
 * since presets.js consults this file's THEME_OPTIONS).
 *
 * If you add a preset there, mirror the (id → theme) row here too.
 * Diagnostic test in `__tests__/plugins/presets.test.js` checks the
 * two tables stay in sync.
 */
const PRESET_TO_THEME = {
  'ligoj-classic':    'ligojLight',
  'reforged':         'ligojClassic',
  'ligoj-dark':       'ligojDark',
  'vscode-dark':      'vscodeDark',
  'solarized-press':  'solarizedLight',
  'solarized-brutal': 'solarizedDark',
  'paper':            'githubLight',
  'cyber-ligoj':      'ligojDark',
  'material-you':      'md3Light',
  'material-you-dark': 'md3Dark',
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: detectTheme(),
    themes,
  },
  /**
   * Vuetify ships its own translations for built-in widget strings
   * ("Items per page", "Page X of Y", chip dismiss labels, etc.). Keep
   * its locale in sync with vue-i18n via setLocale() in plugins/i18n.js.
   */
  locale: {
    locale: 'en',
    fallback: 'en',
    messages: { en, fr },
  },
})
