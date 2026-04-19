import { useApi } from '@/composables/useApi.js'

const BASE = 'rest/service/bt/jira'

export function useBtJiraApi() {
  const { get, post } = useApi()

  return {
    getProject: (subscriptionId) => get(`${BASE}/${subscriptionId}`),
    importCsv: (subscriptionId, formData, mode) => post(`${BASE}/${subscriptionId}/csv/${mode}`, formData),
    getTask: (subscriptionId) => get(`${BASE}/${subscriptionId}/task`),
    getCalendar: (subscriptionId) => get(`${BASE}/calendar/${subscriptionId}`),
  }
}
