import { ref, onUnmounted } from 'vue'
import { useApi } from '@/composables/useApi.js'

export function useImportProgress() {
  const api = useApi()
  const importing = ref(false)
  const status = ref('')
  const entries = ref(0)
  const done = ref(false)
  const failed = ref(false)
  const taskId = ref(null)
  let pollInterval = null

  async function startImport(endpoint, file, mode = 'full') {
    importing.value = true
    done.value = false
    failed.value = false
    status.value = ''
    entries.value = 0

    const formData = new FormData()
    formData.append('file', file)

    const resp = await fetch(`rest/${endpoint}/batch/${mode}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!resp.ok) {
      importing.value = false
      failed.value = true
      status.value = 'error'
      return false
    }

    const id = await resp.text()
    taskId.value = id
    pollStatus(endpoint, id)
    return true
  }

  function pollStatus(endpoint, id) {
    pollInterval = setInterval(async () => {
      try {
        const data = await api.get(`rest/${endpoint}/batch/${id}/status`)
        if (data) {
          status.value = data.status || data
          entries.value = data.entries || 0
          if (data.status === 'SUCCESS' || data.status === 'DONE' || data === 'true') {
            stopPolling()
            done.value = true
            importing.value = false
          } else if (data.status === 'FAILED' || data === 'false') {
            stopPolling()
            failed.value = true
            importing.value = false
          }
        }
      } catch {
        stopPolling()
        failed.value = true
        importing.value = false
      }
    }, 1000)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  onUnmounted(stopPolling)

  return { importing, status, entries, done, failed, taskId, startImport, stopPolling }
}
