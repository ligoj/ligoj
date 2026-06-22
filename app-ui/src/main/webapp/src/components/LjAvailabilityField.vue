<!--
  LjAvailabilityField — a text field with a live "already exists?" check for
  creation forms. As the user types (debounced) it queries a DataTable search
  endpoint and renders inline feedback: a spinner while checking, a green check
  when available, a red alert + error message when the value is already taken.

  Only the check LOGIC is owned here; every visual prop (label, rules, disabled,
  prepend-inner-icon, variant, class, autofocus, density, …) FALLS THROUGH to
  the underlying v-text-field, so it drops in wherever a plain field was used.

    <LjAvailabilityField
      v-model="form.login" v-model:taken="loginTaken"
      endpoint="system/user/roles" field="login" :enabled="!isEdit"
      :label="t('user.login')" prepend-inner-icon="mdi-account"
      :rules="[rules.required]" variant="outlined" autofocus />
    // in save(): if (loginTaken.value) return

  The parent reads `v-model:taken` to block submit of a known duplicate. The
  error message is a STRING (not an array) on purpose: an array literal rebuilt
  each render makes VForm recurse ("Maximum recursive updates exceeded").
-->
<template>
  <v-text-field
    :model-value="modelValue"
    :variant="variant"
    :rules="effectiveRules"
    :error-messages="status === 'taken' ? resolvedTakenMessage : ''"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #append-inner>
      <v-progress-circular v-if="status === 'checking'" size="18" width="2" indeterminate />
      <v-icon v-else-if="status === 'available'" color="success">mdi-check-circle</v-icon>
      <v-icon v-else-if="status === 'taken'" color="error">mdi-alert-circle</v-icon>
    </template>
  </v-text-field>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useApi } from '@/composables/useApi.js'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  /** Field value (v-model). */
  modelValue: { type: String, default: '' },
  /** REST path WITHOUT the leading `rest/`, queried with `?search[value]=…`. */
  endpoint: { type: String, default: '' },
  /** Item property compared (case-insensitive, exact) to the typed value. */
  field: { type: String, default: 'name' },
  /** Gate the check (e.g. only on create, not edit / demo). */
  enabled: { type: Boolean, default: true },
  /** Override the default "already exists" message. */
  takenMessage: { type: String, default: '' },
  /** Minimum length before checking. */
  minLength: { type: Number, default: 1 },
  /** Debounce in ms. */
  debounce: { type: Number, default: 350 },
  /** Field variant — defaults to the form convention so callers needn't repeat it. */
  variant: { type: String, default: 'outlined' },
  /** Validation rules. When omitted, a single "required" rule is applied (the
   *  common case across every creation form); pass an array to override. */
  rules: { type: Array, default: null },
  /** Optional custom check, `(value) => Promise<boolean exists>`. Overrides the
   *  built-in endpoint search when provided. */
  check: { type: Function, default: null },
})
const emit = defineEmits(['update:modelValue', 'update:taken'])

const api = useApi()
const i18n = useI18nStore()
const status = ref('idle') // idle | checking | available | taken | error
const resolvedTakenMessage = computed(() => props.takenMessage || i18n.t('common.alreadyExists'))
// Default to a single required rule (every creation form needs it) unless the
// caller supplies its own rule set.
const effectiveRules = computed(() => props.rules ?? [(v) => (v != null && v !== '') || i18n.t('common.required')])

let timer = null
let seq = 0
function setStatus(s) {
  status.value = s
  emit('update:taken', s === 'taken')
}

async function defaultCheck(value) {
  const url = `rest/${props.endpoint}?search[value]=${encodeURIComponent(value)}&rows=100&page=1`
  const resp = await api.get(url, { silent: true })
  const items = Array.isArray(resp) ? resp : (resp?.data || [])
  const needle = value.toLowerCase()
  return items.some((it) => String(it?.[props.field] ?? '').toLowerCase() === needle)
}

watch(() => props.modelValue, (raw) => {
  clearTimeout(timer)
  const value = (raw ?? '').toString().trim()
  if (!props.enabled || value.length < props.minLength) {
    setStatus('idle')
    return
  }
  setStatus('checking')
  const mine = ++seq
  timer = setTimeout(async () => {
    try {
      const exists = props.check ? await props.check(value) : await defaultCheck(value)
      if (mine === seq) setStatus(exists ? 'taken' : 'available')
    } catch {
      if (mine === seq) setStatus('error')
    }
  }, props.debounce)
})

onBeforeUnmount(() => clearTimeout(timer))
</script>
