import { useApi } from '@/composables/useApi.js'

const BASE = 'rest/service/bt'

export function useBtApi() {
  const { get, post, put, del } = useApi()

  return {
    getSlas: (subscriptionId) => get(`${BASE}/sla/${subscriptionId}`),
    createSla: (data) => post(`${BASE}/sla`, data),
    updateSla: (data) => put(`${BASE}/sla`, data),
    deleteSla: (id) => del(`${BASE}/sla/${id}`),
    getBusinessHours: (subscriptionId) => get(`${BASE}/business-hours/${subscriptionId}`),
    saveBusinessHours: (data) => post(`${BASE}/business-hours`, data),
  }
}
