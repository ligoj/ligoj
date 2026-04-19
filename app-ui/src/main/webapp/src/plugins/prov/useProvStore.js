import { reactive, computed } from 'vue'

const state = reactive({
  subscription: null,
  quote: null,
  loading: false,
  error: null,
})

export function useProvStore() {
  const instances = computed(() => state.quote?.instances || [])
  const databases = computed(() => state.quote?.databases || [])
  const containers = computed(() => state.quote?.containers || [])
  const functions = computed(() => state.quote?.functions || [])
  const storages = computed(() => state.quote?.storages || [])
  const supports = computed(() => state.quote?.supports || [])
  const cost = computed(() => state.quote?.cost || { min: 0, max: 0 })
  const currency = computed(() => state.quote?.currency || { unit: '$', rate: 1 })
  const location = computed(() => state.quote?.location || null)

  const totalResources = computed(() =>
    instances.value.length + databases.value.length + containers.value.length +
    functions.value.length + storages.value.length + supports.value.length
  )

  function setQuote(quote) { state.quote = quote }
  function setSubscription(sub) { state.subscription = sub }
  function setLoading(v) { state.loading = v }
  function setError(err) { state.error = err }

  function addResource(type, resource) {
    const list = state.quote?.[type + 's']
    if (list) list.push(resource)
  }
  function updateResource(type, id, data) {
    const list = state.quote?.[type + 's']
    if (!list) return
    const idx = list.findIndex(r => r.id === id)
    if (idx >= 0) Object.assign(list[idx], data)
  }
  function removeResource(type, id) {
    const list = state.quote?.[type + 's']
    if (!list) return
    const idx = list.findIndex(r => r.id === id)
    if (idx >= 0) list.splice(idx, 1)
  }

  return {
    state,
    instances, databases, containers, functions, storages, supports,
    cost, currency, location, totalResources,
    setQuote, setSubscription, setLoading, setError,
    addResource, updateResource, removeResource,
  }
}
