import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

const STORAGE_KEY = 'ligoj-demo-mode'

// Module-level singleton so every consumer (host views, plugin views, plugin
// `editExtension` contributions) shares the same reactive flag.
const stored = ref(typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY) === 'true')

/**
 * Administration-level demo mode: when enabled (from the host ProfileView,
 * administrators only), views blend demonstration content into the real data —
 * demo tool groups on the dashboard, demo projects in the project list, a demo
 * extension in the project edit dialog. Persisted in the browser local storage
 * under {@link STORAGE_KEY}.
 *
 * The mode is VISIBLE to administrators only: `enabled` is the stored flag AND
 * the administrator status of the current session, so a non-administrator
 * never sees the indicator chip, the demo menu entry nor the demo
 * contributions, even with the flag left in the browser storage. This is a
 * visual decision, not a security measure — the flag is browser-local and the
 * demo content is fake or dropped by the backend.
 *
 * @return {{enabled: import('vue').ComputedRef<boolean>, stored: import('vue').Ref<boolean>, setEnabled: (v: boolean) => void}}
 *   `enabled`: what consumers render on; `stored`: the raw persisted flag (the toggle state).
 */
export function useDemoMode() {
  const auth = useAuthStore()
  const enabled = computed(() => stored.value && auth.isAdmin)
  function setEnabled(value) {
    stored.value = !!value
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    }
  }
  return { enabled, stored, setEnabled }
}
