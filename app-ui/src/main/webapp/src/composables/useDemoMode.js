import { ref } from 'vue'

const STORAGE_KEY = 'ligoj-demo-mode'

// Module-level singleton so every consumer (host views, plugin views, plugin
// `editExtension` contributions) shares the same reactive flag.
const enabled = ref(typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY) === 'true')

/**
 * Administration-level demo mode: when enabled (from the host ProfileView,
 * administrators only), views blend demonstration content into the real data —
 * demo tool groups on the dashboard, demo projects in the project list, a demo
 * extension in the project edit dialog. Persisted in the browser local storage
 * under {@link STORAGE_KEY}.
 *
 * @return {{enabled: import('vue').Ref<boolean>, setEnabled: (v: boolean) => void}}
 */
export function useDemoMode() {
  function setEnabled(value) {
    enabled.value = !!value
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    }
  }
  return { enabled, setEnabled }
}
