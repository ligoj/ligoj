import { ref } from 'vue'
import { useApi } from '@/composables/useApi.js'

export function useAgreement() {
  const api = useApi()
  const needsAgreement = ref(false)
  const showDialog = ref(false)
  const accepted = ref(false)

  async function checkAgreement() {
    try {
      const data = await api.get('rest/system/setting/security-agreement')
      needsAgreement.value = !!data && data !== '0' && data !== 'false'
    } catch {
      needsAgreement.value = false
    }
    return needsAgreement.value
  }

  async function acceptAgreement() {
    await api.post('rest/system/setting/security-agreement/1')
    accepted.value = true
    needsAgreement.value = false
    showDialog.value = false
  }

  function requireAgreement() {
    if (needsAgreement.value && !accepted.value) {
      showDialog.value = true
      return true
    }
    return false
  }

  return { needsAgreement, showDialog, accepted, checkAgreement, acceptAgreement, requireAgreement }
}
