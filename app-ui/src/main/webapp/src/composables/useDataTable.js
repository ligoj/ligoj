import { ref } from 'vue'

/**
 * Composable for Vuetify v-data-table-server backed by legacy Ligoj DataTables API.
 *
 * Legacy API expects: rows, page (1-based), sidx, sord, search[value]
 * Legacy API returns: { recordsTotal, recordsFiltered, data: [...] }
 */
export function useDataTable(endpoint, { defaultSort = 'name', defaultOrder = 'asc', demoData = null } = {}) {
  const items = ref([])
  const totalItems = ref(0)
  const loading = ref(false)
  const error = ref(null)
  const search = ref('')
  const demoMode = ref(false)

  async function load({ page = 1, itemsPerPage = 25, sortBy = [] } = {}) {
    loading.value = true
    error.value = null
    demoMode.value = false
    try {
      const params = new URLSearchParams()
      params.set('rows', String(itemsPerPage))
      params.set('page', String(page))

      const sort = sortBy.length ? sortBy[0] : null
      params.set('sidx', sort?.key || defaultSort)
      params.set('sord', sort?.order || defaultOrder)

      if (search.value) {
        params.set('search[value]', search.value)
      }

      const resp = await fetch(`rest/${endpoint}?${params}`, { credentials: 'include' })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        // If identity provider unavailable and demo data provided, use fallback
        if (body.code === 'internal' && demoData) {
          _applyDemoData(page, itemsPerPage, sortBy)
          return
        }
        error.value = body.message || body.code || `HTTP ${resp.status}`
        items.value = []
        totalItems.value = 0
        return
      }
      const data = await resp.json()
      items.value = data.data || []
      totalItems.value = data.recordsFiltered ?? data.recordsTotal ?? 0
    } catch (e) {
      error.value = e.message || 'Network error'
      items.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  function _applyDemoData(page, itemsPerPage, sortBy) {
    demoMode.value = true
    let all = [...demoData]
    // Client-side search
    if (search.value) {
      const q = search.value.toLowerCase()
      all = all.filter(row => Object.values(row).some(v =>
        String(v ?? '').toLowerCase().includes(q)
      ))
    }
    // Client-side sort
    const sort = sortBy?.length ? sortBy[0] : null
    const key = sort?.key || defaultSort
    const order = sort?.order || defaultOrder
    all.sort((a, b) => {
      const va = String(a[key] ?? '').toLowerCase()
      const vb = String(b[key] ?? '').toLowerCase()
      return order === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    totalItems.value = all.length
    const start = (page - 1) * itemsPerPage
    items.value = all.slice(start, start + itemsPerPage)
  }

  return { items, totalItems, loading, error, search, demoMode, load }
}
