import { useErrorStore } from '@/stores/error.js'

export function useApi() {
  const errorStore = useErrorStore()

  async function request(url, options = {}) {
    const opts = {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    }

    const response = await fetch(url, opts)
    await errorStore.handleResponse(response)
    if (!response.ok) return null

    const ct = response.headers.get('content-type')
    if (ct && ct.includes('application/json')) return response.json()
    if (response.status === 204) return null
    return response.text()
  }

  function get(url) {
    return request(url)
  }

  function post(url, data) {
    return request(url, {
      method: 'POST',
      body: data != null ? JSON.stringify(data) : undefined,
    })
  }

  function put(url, data) {
    return request(url, {
      method: 'PUT',
      body: data != null ? JSON.stringify(data) : undefined,
    })
  }

  function del(url) {
    return request(url, { method: 'DELETE' })
  }

  function upload(url, formData) {
    return request(url, {
      method: 'POST',
      body: formData,
    })
  }

  return { get, post, put, del, upload, request }
}
