import { ref } from 'vue'
import { useErrorStore } from '@/stores/error.js'

export function useImportExport() {
  const errorStore = useErrorStore()
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const uploadResult = ref(null)

  async function exportCsv(endpoint, filename) {
    try {
      const resp = await fetch(`rest/${endpoint}`, {
        credentials: 'include',
        headers: { 'Accept': 'text/csv' },
      })
      if (!resp.ok) {
        // Defer to the central status-code handler so a 401 +
        // `{redirect:"local"}` opens the in-page login dialog (and
        // every other branch — 403 / 412 / 5xx — gets the localised
        // toast it deserves) instead of an ad-hoc `HTTP <n>` string.
        await errorStore.handleResponse(resp)
        return false
      }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'export.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    } catch (e) {
      errorStore.push({ message: e.message || 'Export failed', status: 0 })
      return false
    }
  }

  async function uploadFile(endpoint, file) {
    uploading.value = true
    uploadProgress.value = 0
    uploadResult.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      const resp = await fetch(`rest/${endpoint}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      uploading.value = false
      if (!resp.ok) {
        // `handleResponse` clones the body internally, so we can still
        // read it afterwards for the inline upload-result panel. The
        // 401 path triggers the LoginPromptDialog; other status codes
        // flow through the catalogued `error.*` toasts.
        await errorStore.handleResponse(resp.clone())
        const body = await resp.json().catch(() => ({}))
        const msg = body.message || body.code || `HTTP ${resp.status}`
        uploadResult.value = { success: false, message: msg }
        return false
      }
      const data = await resp.json().catch(() => null)
      uploadResult.value = { success: true, data }
      return true
    } catch (e) {
      uploading.value = false
      uploadResult.value = { success: false, message: e.message }
      errorStore.push({ message: e.message || 'Upload failed', status: 0 })
      return false
    }
  }

  return { uploading, uploadProgress, uploadResult, exportCsv, uploadFile }
}
