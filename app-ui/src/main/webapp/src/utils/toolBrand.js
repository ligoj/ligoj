/*
 * Tool brand colour — ONE way to colour a tool across the UI (plugin manager
 * tiles, home / project subscription glyphs).
 *
 * Priority:
 *   1. the colour of the tool's own SVG icon (`svgBrandColor`), fetched once
 *      per tool from the same URL `NodeIcon` renders;
 *   2. otherwise a name-based colour (`fallbackToolColor`): a small table of
 *      well-known brands, then a deterministic palette pick.
 *
 * `resolveToolColor(node)` combines both and never rejects: a missing or
 * unreadable icon (PNG-only plugin, uninstalled tool) yields the fallback.
 */

const APP_BASE = import.meta.env.BASE_URL

/** Well-known brand colours keyed by the tool display name. */
export const KNOWN_TOOL_COLORS = {
  Jira: '#2563eb', Jenkins: '#d33833', LDAP: '#15a06a', SonarQube: '#4e9bcd', Confluence: '#e6a019',
  'AWS EC2': '#7cb518', GitLab: '#7759c2', 'Provisioning AWS': '#ff7a18', 'Squash TM': '#e0524a',
}

/** Deterministic palette for unknown tools. */
export const TOOL_PALETTE = ['#2563eb', '#d33833', '#15a06a', '#7759c2', '#e6a019', '#0ea5a5', '#db2777', '#7c3aed', '#ff7a18', '#4e9bcd']

/**
 * Name-based colour: the known brand, else a stable palette entry.
 *
 * @param {string} name The tool display name (or id).
 * @returns {string} A `#rrggbb` colour.
 */
export function fallbackToolColor(name) {
  if (KNOWN_TOOL_COLORS[name]) return KNOWN_TOOL_COLORS[name]
  let hash = 0
  const s = String(name || '')
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return TOOL_PALETTE[hash % TOOL_PALETTE.length]
}

/**
 * Icon file base of a tool / instance node (`service:<svc>:<tool>[:<instance>]`), without the extension,
 * as rendered by `NodeIcon`; '' for a service-level node.
 *
 * @param {string|{id?: string}} node The node or its id.
 * @returns {string} The URL base, or ''.
 */
export function toolIconBase(node) {
  const id = (typeof node === 'string' ? node : node?.id) || ''
  const fragments = id.split(':')
  if (fragments.length < 3) return ''
  return `${APP_BASE}main/service/${fragments[1]}/${fragments[2]}/img/${fragments[2]}`
}

// `#rgb`, `#rrggbb` in fill / stroke / stop-color attributes, or the same properties inside a style attribute.
const COLOR_RE = /(?:fill|stroke|stop-color)\s*[=:]\s*["']?\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\b/g

function toRgb(hex) {
  const h = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex
  return { hex: h.toLowerCase(), r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) }
}

function hsl({ r, g, b }) {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  return { s, l }
}

/**
 * The brand colour of an SVG icon: among its `fill` / `stroke` / `stop-color` values, the most saturated colour
 * close to mid-lightness wins, so a gradient's dark stop beats its highlight and neutral greys, whites and
 * blacks are ignored.
 *
 * @param {string} svgText The SVG markup.
 * @returns {string|null} A lowercase `#rrggbb` colour, or null when no usable colour exists.
 */
export function svgBrandColor(svgText) {
  if (!svgText || typeof svgText !== 'string') return null
  let best = null
  for (const match of svgText.matchAll(COLOR_RE)) {
    const rgb = toRgb(match[1])
    const { s, l } = hsl(rgb)
    // Neutral (grey / white / black) tones are not brand colours
    if (s < 0.25 || l > 0.92 || l < 0.1) continue
    const score = s * (1 - Math.abs(l - 0.45))
    if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && l < best.l)) {
      best = { hex: rgb.hex, score, l }
    }
  }
  return best ? best.hex : null
}

// Resolved SVG colours per icon base (null = no usable colour / unavailable), and the in-flight fetches.
const svgColors = new Map()
const inFlight = new Map()

/** Test hook: forget every resolved icon colour. */
export function _resetToolColorCache() {
  svgColors.clear()
  inFlight.clear()
}

async function fetchSvgColor(base) {
  if (svgColors.has(base)) return svgColors.get(base)
  if (!inFlight.has(base)) {
    inFlight.set(base, (async () => {
      let color = null
      try {
        const resp = await fetch(`${base}.svg`, { credentials: 'include' })
        if (resp.ok) color = svgBrandColor(await resp.text())
      } catch { /* unreachable icon: fallback */ }
      svgColors.set(base, color)
      inFlight.delete(base)
      return color
    })())
  }
  return inFlight.get(base)
}

/**
 * The colour of a tool: from its SVG icon when available, else from its name. Never rejects.
 *
 * @param {string|{id?: string, name?: string}} node The tool / instance node (or its id).
 * @param {string} [name] The display name used by the fallback, `node.name` (then the id) by default.
 * @returns {Promise<string>} A colour.
 */
export async function resolveToolColor(node, name) {
  const label = name ?? (typeof node === 'object' ? (node?.name || node?.id) : node) ?? ''
  const base = toolIconBase(node)
  const color = base ? await fetchSvgColor(base) : null
  return color || fallbackToolColor(label)
}
