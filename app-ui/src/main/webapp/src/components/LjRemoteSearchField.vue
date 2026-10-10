<template>
  <!-- A tool parameter picked among the remote items of the selected instance,
       searched as the user types: `<path>/<instance node>/<criteria>`. The list
       shows the item name with its identifier below; the identifier is the
       stored value. `allowNew` also accepts a typed value that is not listed. -->
  <component
    :is="allowNew ? LigojCombobox : LigojAutocomplete"
    :model-value="modelValue"
    :label="label"
    :hint="hint"
    :persistent-hint="!!hint"
    :placeholder="placeholderText"
    :items="items"
    :loading="loading"
    :rules="mandatory ? REQUIRED : OPTIONAL"
    :return-object="false"
    item-props
    no-filter
    clearable
    variant="outlined"
    density="comfortable"
    hide-details="auto"
    @update:search="search"
    @update:model-value="(v) => emit('update:modelValue', v ?? '')"
  />
</template>

<script setup>
/**
 * LjRemoteSearchField — the subscribe-wizard input of a tool parameter whose
 * value is picked among the remote items of the selected instance: a Confluence
 * space, a Git repository, a virtual machine... Tools mount it through their
 * `parameterField` hook with `remoteSearchField(options)`, which binds the
 * search options below to the props the wizard passes to every custom field.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import LigojAutocomplete from '@/components/LigojAutocomplete.vue'
import LigojCombobox from '@/components/LigojCombobox.vue'
import { useApi } from '@/composables/useApi.js'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  parameter: { type: Object, required: true },
  // Values of the whole form, by parameter identifier
  formValues: { type: Object, default: () => ({}) },
  // The selected tool instance, the node the items are searched in
  instanceNodeId: { type: String, default: null },
  // REST path of the search, completed by `/<instance node>/<criteria>`
  path: { type: String, required: true },
  // Stored value of an item
  toValue: { type: Function, default: (item) => item.id },
  // Text below the item name, by default the stored value when it differs from the name
  toSubtitle: { type: Function, default: null },
  // Parameters of the form sent as query parameters, for a search depending on them
  query: { type: Array, default: () => [] },
  // Accept a typed value that is not listed, such as a repository to create
  allowNew: { type: Boolean, default: false },
  // i18n key or text of the placeholder
  placeholder: { type: String, default: 'common.typeToSearch' },
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18nStore()
const api = useApi()

function tOrNull(key) { const v = t(key); return v === key ? null : v }

// Constant rule arrays: an inline array is a new reference on each render and makes v-form revalidate in a loop
const REQUIRED = [(v) => (v != null && String(v).trim() !== '') || (tOrNull('wizard.rule.required') ?? t('common.required'))]
const OPTIONAL = []
const mandatory = computed(() => !!(props.parameter?.mandatory || props.parameter?.required))
const label = computed(() => `${tOrNull(props.parameter?.id) ?? props.parameter?.id}${mandatory.value ? ' *' : ''}`)
const hint = computed(() => tOrNull(`${props.parameter?.id}-description`) ?? props.parameter?.description ?? null)
const placeholderText = computed(() => tOrNull(props.placeholder) ?? props.placeholder)

const items = ref([])
const loading = ref(false)
// Only the latest search updates the list
let pending = null

function toItem(item) {
  const value = props.toValue(item)
  const title = item.name ?? String(value)
  const subtitle = props.toSubtitle ? props.toSubtitle(item) : (value != null && String(value) !== title ? String(value) : null)
  return { title, subtitle, value }
}

function searchUrl(criteria) {
  const url = `${props.path}/${encodeURIComponent(props.instanceNodeId)}/${encodeURIComponent(criteria)}`
  const query = new URLSearchParams()
  for (const id of props.query) {
    const value = props.formValues?.[id]
    if (value != null && value !== '') query.append(id, value)
  }
  return query.size ? `${url}?${query}` : url
}

// A search waits for a pause in the typing: a tool may list all its items for each request (AWS) or rate-limit them (GitHub)
const DEBOUNCE = 300
let timer = null
onBeforeUnmount(() => clearTimeout(timer))

function search(term) {
  clearTimeout(timer)
  const criteria = String(term ?? '').trim()
  // The search is path-shaped: an empty criteria is not a valid request
  if (!props.instanceNodeId || !criteria) {
    pending = null
    items.value = []
    loading.value = false
    return
  }
  const token = Symbol('search')
  pending = token
  loading.value = true
  timer = setTimeout(() => load(criteria, token), DEBOUNCE)
}

async function load(criteria, token) {
  try {
    const data = await api.get(searchUrl(criteria), { silent: true })
    if (pending !== token) return
    const list = Array.isArray(data) ? data : (data?.data || [])
    items.value = list.map(toItem)
  } catch {
    if (pending === token) items.value = []
  } finally {
    if (pending === token) loading.value = false
  }
}
</script>
