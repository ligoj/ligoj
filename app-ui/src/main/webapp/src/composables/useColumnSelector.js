/*
 * Shared column-visibility logic for the Ligoj data tables.
 *
 * `useColumnSelector` turns a headers array into a user-toggleable set of
 * columns, surfaced through the table's header tools cog (TableToolsMenu).
 * It is the standard column-selector for every LigojDataTable /
 * LigojDataTableServer — a table opts out with `:column-selector="false"`.
 *
 * Callers pass getters (or plain values):
 *   headers     function/ref returning the full headers array
 *   storageKey  optional localStorage key — when set, the hidden set is
 *               persisted so the user's choice survives reloads
 *   pinned      keys that can never be hidden. The LAST column is always
 *               pinned implicitly since it hosts the tools cog.
 *
 * Returns:
 *   visibleHeaders  computed — headers minus the hidden (non-pinned) ones
 *   columnOptions   computed — { key, title, visible } for the cog menu
 *   toggleColumn    (key) => void — flip a column and persist
 *   hidden          ref<Set> — the raw hidden-key set (mostly for tests)
 */
import { ref, computed, watch } from 'vue'

function resolve(v) {
  return typeof v === 'function' ? v() : v?.value ?? v
}

function loadHidden(key) {
  if (!key || typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(key)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

function keyOf(h) {
  return String(h?.key ?? h?.value ?? '')
}

export function useColumnSelector({ headers, storageKey = null, pinned = () => [] }) {
  const resolveHeaders = () => {
    const h = resolve(headers)
    return Array.isArray(h) ? h : []
  }
  const resolveKey = () => resolve(storageKey) ?? null

  const hidden = ref(loadHidden(resolveKey()))

  // Reload the persisted set when the storage key changes (e.g. a table
  // that swaps keys per tab). Ignored when no key is supplied.
  watch(resolveKey, (k) => { hidden.value = loadHidden(k) })

  function persist() {
    const key = resolveKey()
    if (!key || typeof localStorage === 'undefined') return
    localStorage.setItem(key, JSON.stringify([...hidden.value]))
  }

  const pinnedKeys = computed(() => {
    const raw = resolve(pinned)
    const set = new Set((Array.isArray(raw) ? raw : []).map(String))
    // The last column carries the tools cog — never hideable.
    const list = resolveHeaders()
    const last = list[list.length - 1]
    const lastKey = keyOf(last)
    if (lastKey) set.add(lastKey)
    return set
  })

  const visibleHeaders = computed(() =>
    resolveHeaders().filter((h) => {
      const k = keyOf(h)
      return pinnedKeys.value.has(k) || !hidden.value.has(k)
    }),
  )

  const columnOptions = computed(() =>
    resolveHeaders()
      .filter((h) => {
        const k = keyOf(h)
        return k && !pinnedKeys.value.has(k)
      })
      .map((h) => ({
        key: keyOf(h),
        title: h.title || h.key || h.value,
        visible: !hidden.value.has(keyOf(h)),
      })),
  )

  function toggleColumn(key) {
    const k = String(key)
    if (pinnedKeys.value.has(k)) return
    const next = new Set(hidden.value)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    hidden.value = next
    persist()
  }

  return { visibleHeaders, columnOptions, toggleColumn, hidden }
}
