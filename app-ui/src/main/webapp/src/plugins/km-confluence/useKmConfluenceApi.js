import { useApi } from '@/composables/useApi.js'

const BASE = 'rest/service/km/confluence'

export function useKmConfluenceApi() {
  const { get } = useApi()
  return {
    getSpaces: (nodeId) => get(`${BASE}/${nodeId}`),
    getActivity: (nodeId) => get(`${BASE}/${nodeId}/activity`),
  }
}
