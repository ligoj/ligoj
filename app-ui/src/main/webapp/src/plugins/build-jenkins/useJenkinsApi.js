import { useApi } from '@/composables/useApi.js'

const BASE = 'rest/service/build/jenkins'

export function useJenkinsApi() {
  const { get, post } = useApi()

  return {
    getJob: (subscriptionId) => get(`${BASE}/${subscriptionId}`),
    build: (subscriptionId) => post(`${BASE}/build/${subscriptionId}`),
    getBranches: (subscriptionId) => get(`${BASE}/${subscriptionId}/branches`),
  }
}
