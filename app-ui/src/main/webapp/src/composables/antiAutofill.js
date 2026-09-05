/**
 * Field names for the anti-autofill wrappers (LigojTextField, LigojTextarea,
 * LigojAutocomplete, LigojSelect, LigojCombobox): unique per instance AND
 * randomized per page load.
 *
 * Browsers key their form history — the native dropdown of values previously
 * typed in "the same" field — on the field `name`. A deterministic name (a
 * plain counter restarts at 1 on every load, so the same field gets the same
 * name each time) lets that history match again, whatever the `autocomplete`
 * token, which browsers only partially honor. A name that never repeats
 * across loads can never match a stored entry.
 */
const salt = Math.random().toString(36).slice(2, 8)
let seq = 0

/**
 * @param {string} prefix Wrapper-specific prefix, e.g. 'lj-tf'.
 * @returns {string} A field name unique for this page load and this instance.
 */
export function uniqueFieldName(prefix) {
  return `${prefix}-${salt}-${++seq}`
}
