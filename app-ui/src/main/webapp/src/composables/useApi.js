import { useErrorStore } from '@/stores/error.js'

export function useApi() {
  const errorStore = useErrorStore()

  async function request(url, options = {}) {
    const { silent, ...rest } = options
    const opts = {
      credentials: 'include',
      ...rest,
      headers: {
        ...(rest.body && typeof rest.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
    }

    const response = await fetch(url, opts)
    if (!silent) await errorStore.handleResponse(response)
    if (!response.ok) return null

    const ct = response.headers.get('content-type')
    if (ct && ct.includes('application/json')) return response.json()
    if (response.status === 204) return null
    return response.text()
  }

  function get(url, options) {
    return request(url, options)
  }

  function post(url, data, options) {
    return request(url, {
      ...options,
      method: 'POST',
      body: data != null ? JSON.stringify(data) : undefined,
    })
  }

  function put(url, data, options) {
    return request(url, {
      ...options,
      method: 'PUT',
      body: data != null ? JSON.stringify(data) : undefined,
    })
  }

  function del(url, options) {
    return request(url, { ...options, method: 'DELETE' })
  }

  function upload(url, formData, options) {
    return request(url, {
      ...options,
      method: 'POST',
      body: formData,
    })
  }

  return { get, post, put, del, upload, request }
}
