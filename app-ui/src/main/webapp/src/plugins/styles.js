/*
 * UI "Style" catalog — building block for the unified Theme preset
 * picker in `presets.js`. Styles are no longer user-selectable on
 * their own; each preset names a (theme, style) pair which we apply
 * together. Keeping the catalog exported so `presets.js` (and
 * anyone debugging) can introspect what each style id represents.
 *
 * The "default" id means "ship Vuetify as-is". Adding a new style:
 * append an entry here AND add the matching `[data-style="<id>"]`
 * block in `assets/vuetify-overrides.css`.
 *
 * `compact` is NOT in this catalog any more — it became an orthogonal
 * global toggle (see `applyCompact()` below) so it can layer over any
 * preset rather than fighting with the style slot for one of them.
 */

const STORAGE_KEY = 'ligoj-style'
const COMPACT_KEY = 'ligoj-compact'

/**
 * Public style catalog. Order is the picker order: keep "default"
 * first so brand-new users see the baseline before the louder
 * alternatives. The grouping (classic → bold → modern → niche) is
 * informal — there's no submenu, but the order makes the picker grid
 * read top-down by intensity.
 */
export const STYLE_OPTIONS = [
  /* --- classic --- */
  {
    id: 'default',
    label: 'Vuetify (default)',
    description: 'The stock Vuetify look — no overrides.',
    previews: ['#e0e0e0', '#9e9e9e', '#616161'],
    radius: '4px',
  },
  {
    id: 'ligoj-classic',
    label: 'Reforged',
    description: 'Bootstrap Material revival — purple primary, teal accents, ripples, modal scale-in.',
    previews: ['#9c27b0', '#0aa89e', '#3f51b5'],
    radius: '4px',
  },
  {
    id: 'sharp',
    label: 'Sharp / Brutalist',
    description: 'Zero radius, monospaced labels, harsh borders.',
    previews: ['#000000', '#ffeb3b', '#ffffff'],
    radius: '0',
  },

  /* --- bold / 2026 --- */
  {
    id: 'vibrant',
    label: 'Vibrant',
    description: 'Animated gradients, navy sidebar, lifted cards.',
    previews: [
      'linear-gradient(135deg, #1a237e, #283593)',
      'linear-gradient(135deg, #f57c00, #e53935)',
      '#fafafa',
    ],
    radius: '14px',
  },
  {
    id: 'argon',
    label: 'Argon Vibes',
    description: 'Gradient stat cards & pill buttons — Argon 2 inspired.',
    previews: [
      'linear-gradient(135deg, #5e72e4, #825ee4)',
      'linear-gradient(135deg, #11cdef, #1171ef)',
      'linear-gradient(135deg, #2dce89, #2dcecc)',
    ],
    radius: '12px',
  },
  {
    id: 'glass',
    label: 'Glass / Aurora',
    description: 'Backdrop-blurred panels on a navy aurora gradient.',
    previews: [
      'linear-gradient(135deg, #1d1d4a, #3a3a8e)',
      'rgba(255,255,255,0.18)',
      'linear-gradient(135deg, #6a82fb, #fc5c7d)',
    ],
    radius: '18px',
  },

  /* --- design systems --- */
  {
    id: 'md3',
    label: 'Material Design 3',
    description: 'Google Material You — Roboto, rounded shapes, state-layer ripples, emphasized motion.',
    previews: ['#6750a4', '#7d5260', '#eaddff'],
    radius: '16px',
  },

  /* --- niche / experimental --- */
  {
    id: 'bento',
    label: 'Bento',
    description: 'Apple-style oversized rounded squares.',
    previews: ['#ffe4ec', '#dcefff', '#fff7d6'],
    radius: '28px',
  },
  {
    id: 'neon',
    label: 'Neon / Cyberpunk',
    description: 'Black canvas, glowing cyan & magenta accents.',
    previews: ['#05010f', '#00fff0', '#ff2bd6'],
    radius: '6px',
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Warm cream canvas, ink black text, no shadows.',
    previews: ['#f3ede1', '#1a1a1a', '#c8442a'],
    radius: '2px',
  },
]

/**
 * Last-known-good style id read from localStorage. Falls back to the
 * default when storage is unavailable (SSR / private browsing) or
 * holds an unknown id (stale entry left by a previous Ligoj version
 * after a style was renamed or removed).
 */
export function detectStyle() {
  if (typeof localStorage === 'undefined') return 'default'
  const stored = localStorage.getItem(STORAGE_KEY)
  return STYLE_OPTIONS.some((s) => s.id === stored) ? stored : 'default'
}

/**
 * Persist the user's selection. `applyStyle` updates the DOM
 * separately — callers do both so a refresh keeps the choice AND the
 * current page reflects it immediately.
 */
export function persistStyle(id) {
  if (typeof localStorage === 'undefined') return
  if (STYLE_OPTIONS.some((s) => s.id === id)) {
    localStorage.setItem(STORAGE_KEY, id)
  }
}

/**
 * Push the style id onto `<html data-style="…">`. Idempotent — safe
 * to call from a router beforeEach guard or a watcher. We write the
 * attribute even for the default so styling rules can target
 * `[data-style="default"]` if they ever need to opt back in.
 */
export function applyStyle(id) {
  if (typeof document === 'undefined') return
  const safeId = STYLE_OPTIONS.some((s) => s.id === id) ? id : 'default'
  document.documentElement.dataset.style = safeId
}

/**
 * Boot helper: read storage and apply. Called once from `main.js`
 * before the SPA mounts so the first paint already reflects the user
 * preference (no flash of unstyled Vuetify defaults).
 */
export function bootStyle() {
  const id = detectStyle()
  applyStyle(id)
  return id
}

/* ===========================================================================
 * Compact mode — orthogonal global toggle
 *
 * Used to live as a style id (`compact`). It got promoted to its own slot
 * because density is independent of shape language: a user might want
 * "Pulse + compact" or "Aurora + compact" without losing the preset's
 * visual identity. Implemented as `<html data-compact="true">`; the
 * matching CSS lives at `[data-compact="true"]` in
 * `assets/vuetify-overrides.css` and is written to layer over every
 * preset (it only touches sizes / paddings, never colors / radii).
 * ========================================================================= */

export function detectCompact() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(COMPACT_KEY) === 'true'
}

export function persistCompact(value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(COMPACT_KEY, value ? 'true' : 'false')
}

/**
 * Flip `<html data-compact="…">`. We set/remove the attribute
 * (instead of writing "false") so CSS rules can use the cleaner
 * `[data-compact="true"]` selector without an extra "not('false')"
 * guard.
 */
export function applyCompact(value) {
  if (typeof document === 'undefined') return
  if (value) {
    document.documentElement.dataset.compact = 'true'
  } else {
    delete document.documentElement.dataset.compact
  }
}

export function bootCompact() {
  const v = detectCompact()
  applyCompact(v)
  return v
}
