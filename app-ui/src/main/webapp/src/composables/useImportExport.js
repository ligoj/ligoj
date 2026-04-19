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
        errorStore.push({ message: `Export failed: HTTP ${resp.status}`, status: resp.status })
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
        const body = await resp.json().catch(() => ({}))
        const msg = body.message || body.code || `HTTP ${resp.status}`
        uploadResult.value = { success: false, message: msg }
        errorStore.push({ message: msg, status: resp.status })
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
