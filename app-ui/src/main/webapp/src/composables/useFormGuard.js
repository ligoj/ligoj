import { ref, watch, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export function useFormGuard(formData, { message = 'You have unsaved changes. Discard them?' } = {}) {
  const isDirty = ref(false)
  const showGuardDialog = ref(false)
  let savedSnapshot = ''
  let pendingNext = null

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

  // Vue Router guard
  onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
      pendingNext = next
      showGuardDialog.value = true
      return false
    }
    next()
  })

  function confirmLeave() {
    showGuardDialog.value = false
    isDirty.value = false
    if (pendingNext) {
      pendingNext()
      pendingNext = null
    }
  }

  function cancelLeave() {
    showGuardDialog.value = false
    pendingNext = null
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

  return { isDirty, showGuardDialog, markClean, confirmLeave, cancelLeave, init }
}
