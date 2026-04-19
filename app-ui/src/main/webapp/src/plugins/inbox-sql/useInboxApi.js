import { useApi } from '@/composables/useApi.js'

const BASE = 'rest/message'

export function useInboxApi() {
  const { get, post, put } = useApi()

  return {
    getMessages: (page = 0, size = 10, filter = '') => {
      const params = new URLSearchParams({ page, size })
      if (filter) params.append('q', filter)
      return get(`${BASE}/my?${params}`)
    },
    sendMessage: (data) => post(BASE, data),
    markRead: (id) => put(`${BASE}/${id}/read`),
    getAudience: (type, target) => get(`${BASE}/audience/${type}/${encodeURIComponent(target)}`),
  }
}
