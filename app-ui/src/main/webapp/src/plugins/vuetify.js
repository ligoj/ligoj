import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { en, fr } from 'vuetify/locale'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
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

// IntelliJ Darcula — JetBrains' iconic dark theme.
const intellijDarcula = {
  dark: true,
  colors: {
    primary: '#4f9eee',
    secondary: '#cc7832',
    accent: '#ffc66d',
    error: '#cc4040',
    warning: '#ffc66d',
    info: '#4f9eee',
    success: '#6a8759',
    background: '#2b2b2b',
    surface: '#3c3f41',
  },
}

// Dracula — popular cross-editor palette.
const dracula = {
  dark: true,
  colors: {
    primary: '#bd93f9',
    secondary: '#ff79c6',
    accent: '#8be9fd',
    error: '#ff5555',
    warning: '#f1fa8c',
    info: '#8be9fd',
    success: '#50fa7b',
    background: '#282a36',
    surface: '#44475a',
  },
}

// Monokai — Sublime / TextMate classic.
const monokai = {
  dark: true,
  colors: {
    primary: '#66d9ef',
    secondary: '#f92672',
    accent: '#ae81ff',
    error: '#f92672',
    warning: '#f4bf75',
    info: '#66d9ef',
    success: '#a6e22e',
    background: '#272822',
    surface: '#383830',
  },
}

// Nord — Arctic, north-bluish palette.
const nord = {
  dark: true,
  colors: {
    primary: '#88c0d0',
    secondary: '#81a1c1',
    accent: '#b48ead',
    error: '#bf616a',
    warning: '#ebcb8b',
    info: '#5e81ac',
    success: '#a3be8c',
    background: '#2e3440',
    surface: '#3b4252',
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

const themes = {
  ligojLight,
  ligojDark,
  solarizedLight,
  solarizedDark,
  githubLight,
  vscodeDark,
  intellijLight,
  intellijDarcula,
  dracula,
  monokai,
  nord,
  oneDark,
}

/**
 * Public theme catalog — a UI-friendly array used by Settings/Profile
 * to render selectors. `swatch` lists three colors picked from the
 * theme's palette so a tile can preview the look at a glance.
 */
export const THEME_OPTIONS = [
  { id: 'ligojLight',      label: 'Ligoj Light',      dark: false, swatch: ['#1a237e', '#f57c00', '#fafafa'] },
  { id: 'ligojDark',       label: 'Ligoj Dark',       dark: true,  swatch: ['#5c6bc0', '#ffb74d', '#121212'] },
  { id: 'solarizedLight',  label: 'Solarized Light',  dark: false, swatch: ['#268bd2', '#b58900', '#fdf6e3'] },
  { id: 'solarizedDark',   label: 'Solarized Dark',   dark: true,  swatch: ['#268bd2', '#b58900', '#002b36'] },
  { id: 'githubLight',     label: 'GitHub Light',     dark: false, swatch: ['#0969da', '#1a7f37', '#ffffff'] },
  { id: 'vscodeDark',      label: 'VS Code Dark+',    dark: true,  swatch: ['#007acc', '#4ec9b0', '#1e1e1e'] },
  { id: 'intellijLight',   label: 'IntelliJ Light',   dark: false, swatch: ['#4a86e8', '#008000', '#ffffff'] },
  { id: 'intellijDarcula', label: 'IntelliJ Darcula', dark: true,  swatch: ['#4f9eee', '#ffc66d', '#2b2b2b'] },
  { id: 'dracula',         label: 'Dracula',          dark: true,  swatch: ['#bd93f9', '#ff79c6', '#282a36'] },
  { id: 'monokai',         label: 'Monokai',          dark: true,  swatch: ['#66d9ef', '#f92672', '#272822'] },
  { id: 'nord',            label: 'Nord',             dark: true,  swatch: ['#88c0d0', '#b48ead', '#2e3440'] },
  { id: 'oneDark',         label: 'One Dark',         dark: true,  swatch: ['#61afef', '#c678dd', '#282c34'] },
]

const STORAGE_KEY = 'ligoj-theme'

function detectTheme() {
  if (typeof localStorage === 'undefined') return 'ligojLight'
  const stored = localStorage.getItem(STORAGE_KEY)
  return themes[stored] ? stored : 'ligojLight'
}

/**
 * Persist the user's theme selection. Components still need to update
 * Vuetify's reactive `theme.global.name.value` themselves — this helper
 * only owns the durable storage side.
 */
export function persistTheme(name) {
  if (typeof localStorage !== 'undefined' && themes[name]) {
    localStorage.setItem(STORAGE_KEY, name)
  }
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
