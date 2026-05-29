import { ref, watch, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

const STORAGE_KEY = 'ligoj.skipUnsavedConfirmation'

export function useFormGuard(formData) {
  const router = useRouter()
  const isDirty = ref(false)
  const showGuardDialog = ref(false)
  const skipUnsavedConfirmation = ref(
    typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY) === 'true'
  )
  let savedSnapshot = ''
  // Capture the target route, not the `next` callback. Vue Router 4
  // considers `next` consumed once a guard returns `false`; calling
  // `pendingNext()` afterwards triggers a "Unhandled error during
  // execution of native event handler" warning surfaced through the
  // confirm dialog's button. Re-navigating via `router.push(to)` is
  // the idiomatic v4 pattern and side-steps the issue entirely.
  let pendingTo = null

  function snapshot() {
    return JSON.stringify(formData.value)
  }

  function markClean() {
    savedSnapshot = snapshot()
    isDirty.value = false
  }

  // Watch form changes
  watch(formData, () => {
    isDirty.value = snapshot() !== savedSnapshot
  }, { deep: true })

  onBeforeRouteLeave((to) => {
    if (isDirty.value && !skipUnsavedConfirmation.value) {
      pendingTo = to
      showGuardDialog.value = true
      return false
    }
    // Returning undefined lets the navigation proceed — no need to
    // call next() in the v4 API.
  })

  function confirmLeave() {
    showGuardDialog.value = false
    isDirty.value = false
    if (pendingTo) {
      const to = pendingTo
      pendingTo = null
      router.push(to)
    }
  }

  function cancelLeave() {
    showGuardDialog.value = false
    pendingTo = null
  }

  // Browser beforeunload
  function onBeforeUnload(e) {
    if (isDirty.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', onBeforeUnload)
    onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
  }

  // Initial snapshot after mount (call from onMounted after data loaded)
  function init() {
    savedSnapshot = snapshot()
    isDirty.value = false
  }

  function setSkipUnsavedConfirmation(value) {
    skipUnsavedConfirmation.value = !!value
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    }
  }

  return { isDirty, showGuardDialog, markClean, confirmLeave, cancelLeave, init,
           skipUnsavedConfirmation, setSkipUnsavedConfirmation }
}
