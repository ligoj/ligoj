<!--
  ApiVerifyDialog — API access verification: every operation of the backend's
  OpenAPI description (rest/openapi.json) crossed with a set of API
  authorizations ({method?, pattern} entries — a missing method grants all).
  Shows the allowed rate, live-filters by a typed URL/path (scheme, host and
  the /ligoj/ base are stripped) with an allowed/denied verdict, and a row
  click deep-links the API explorer (/api?op=…) in a new tab, focused on the
  operation.

  Reused by the user profile (own session authorizations + admin bypass), the
  system Roles view (one role's authorizations) and the system Users view
  (union of the user's roles' authorizations) — pass `subject` to append the
  audited role/user to the dialog title.
-->
<template>
  <LjDialog :model-value="modelValue" :title="dialogTitle" icon="mdi-shield-search" :max-width="920" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-progress-linear v-if="specLoading" indeterminate color="primary" class="mb-4" />
    <v-alert v-else-if="specError" type="warning" variant="tonal" density="compact">{{ specError }}</v-alert>
    <template v-else-if="spec">
      <div class="verify-top">
        <v-chip size="small" variant="tonal" color="primary" label>{{ t('profile.apiVerifyAuths', { n: authorizations.length }) }}</v-chip>
        <div class="verify-rate">
          <div class="verify-rate-label">{{ t('profile.apiVerifyRate', { allowed: allowedOpsCount, total: verifyOps.length }) }} — {{ allowedRate }}%</div>
          <v-progress-linear :model-value="allowedRate" color="success" height="8" rounded />
        </div>
      </div>
      <v-text-field v-model="verifyQuery" variant="outlined" density="compact" clearable hide-details autocomplete="off"
        prepend-inner-icon="mdi-link-variant" :placeholder="t('profile.apiVerifyFilterPlaceholder')" class="mb-2" />
      <div v-if="normalizedQuery" class="verify-feedback" :class="urlAllowed ? 'ok' : 'ko'">
        <v-icon size="16">{{ urlAllowed ? 'mdi-shield-check' : 'mdi-shield-off-outline' }}</v-icon>
        <span>{{ urlAllowed ? t('profile.apiVerifyAllowed', { methods: urlAllowedMethods.join(', ') }) : t('profile.apiVerifyDenied') }}</span>
      </div>
      <v-alert v-if="urlAllowed && !filteredVerifyOps.length" type="warning" variant="tonal" density="compact" class="mb-3">
        {{ t('profile.apiVerifyNoOps') }}
      </v-alert>
      <VibrantDataTable :key="normalizedQuery" :headers="verifyHeaders" :items="pagedVerifyOps" :items-length="filteredVerifyOps.length"
        :loading="false" item-value="key" :tools="false" :empty-text="t('common.noData')" @update:options="onVerifyOptions" @row-click="openApiExplorer">
        <template #cell.method="{ item }">
          <v-chip size="x-small" variant="flat" :color="METHOD_COLORS[item.method] || '#607d8b'" class="vmethod" label>{{ item.method }}
            <v-tooltip activator="parent" location="top" :text="t('profile.apiVerifyRowTooltip')" />
          </v-chip>
        </template>
        <template #cell.path="{ item }">
          <code class="vpath">{{ item.path }}<v-tooltip activator="parent" location="top" :text="t('profile.apiVerifyRowTooltip')" /></code>
        </template>
        <template #cell.summary="{ item }">
          <span class="vsum">{{ item.summary }}<v-tooltip v-if="item.description" activator="parent" location="top" max-width="460" :text="item.description" /></span>
        </template>
        <template #cell.allowed="{ item }">
          <LjStatus :status="item.allowed ? 'ok' : 'error'" :tooltip="item.allowed ? t('profile.apiVerifyStatusAllowed') : t('profile.apiVerifyStatusDenied')" />
        </template>
      </VibrantDataTable>
    </template>
    <template #footer>
      <LjButton variant="ghost" @click="emit('update:modelValue', false)">{{ t('common.close') }}</LjButton>
    </template>
  </LjDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'
import { useApi } from '@/composables/useApi.js'
import LjDialog from '@/components/LjDialog.vue'
import LjButton from '@/components/LjButton.vue'
import LjStatus from '@/components/LjStatus.vue'
import VibrantDataTable from '@/components/VibrantDataTable.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // API authorization entries: {method?, pattern} (or bare pattern strings —
  // both grant every method). Same shape as the session's apiAuthorizations
  // and the system roles' `type: 'api'` authorizations.
  authorizations: { type: Array, default: () => [] },
  // Bypass: everything is allowed (the session's admin flag). Do NOT set it
  // when auditing a role/user — their access is purely pattern-driven.
  admin: { type: Boolean, default: false },
  // Audited role name / user login, appended to the dialog title.
  subject: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const t = useI18nStore().t
const api = useApi()

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
// Same palette as the profile's API Permissions pills.
const METHOD_COLORS = { GET: '#2196f3', POST: '#4caf50', PUT: '#ff9800', PATCH: '#9c27b0', DELETE: '#f44336', HEAD: '#607d8b', OPTIONS: '#607d8b' }

const dialogTitle = computed(() => (props.subject ? `${t('profile.apiVerifyTitle')} — ${props.subject}` : t('profile.apiVerifyTitle')))

const spec = ref(null)
const specLoading = ref(false)
const specError = ref(null)
const verifyQuery = ref('')
const verifyOptions = ref({ page: 1, itemsPerPage: 25, sortBy: [] })

// Lazy-load the spec on first open; reset the filter on every open so a
// reused instance (row after row) starts clean for the new subject.
watch(() => props.modelValue, (open) => {
  if (!open) return
  verifyQuery.value = ''
  verifyOptions.value = { page: 1, itemsPerPage: 25, sortBy: [] }
  if (!spec.value && !specLoading.value) loadSpec()
}, { immediate: true })

async function loadSpec() {
  specLoading.value = true
  specError.value = null
  try {
    const data = await api.get('rest/openapi.json')
    if (!data?.paths) throw new Error('empty spec')
    spec.value = data
  } catch {
    specError.value = t('profile.apiVerifyError')
  }
  specLoading.value = false
}

/** Same semantics as the auth store's isAllowedApi, over the PROVIDED
 *  authorizations: a permission with no method grants ALL methods. */
function isAllowedApi(url, method) {
  if (props.admin) return true
  return (props.authorizations || []).some((a) => {
    const pattern = typeof a === 'string' ? a : a.pattern
    const m = typeof a === 'string' ? null : a.method
    if (m && m !== method) return false
    try { return new RegExp(pattern).test(url) } catch { return false }
  })
}

/** `^…$` regex for an OpenAPI path whose `{var}` templates become `[^/]+`. */
function templateRegex(full) {
  const pattern = full.split(/(\{[^}]*\})/)
    .map((part) => (part.startsWith('{') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('')
  return new RegExp(`^${pattern}$`, 'i')
}

/** An operation is allowed when at least one authorization matches its
 *  concrete URL. Path templates are substituted with representative values
 *  ('1' then 'a') so patterns constraining a segment (`[0-9]+`…) still match. */
function operationAllowed(method, path) {
  const full = `rest${path}`
  const candidates = full.includes('{')
    ? [full.replace(/\{[^}]*\}/g, '1'), full.replace(/\{[^}]*\}/g, 'a'), full]
    : [full]
  return candidates.some((c) => isAllowedApi(c, method))
}

const verifyOps = computed(() => {
  const out = []
  const paths = spec.value?.paths || {}
  for (const path of Object.keys(paths)) {
    for (const method of Object.keys(paths[path])) {
      if (!METHODS.includes(method)) continue
      const op = paths[path][method] || {}
      const M = method.toUpperCase()
      out.push({
        key: `${method}|${path}`,
        method: M,
        path,
        summary: op.summary || op.operationId || '',
        description: op.description || '',
        allowed: operationAllowed(M, path),
        templateRe: templateRegex(`rest${path}`),
      })
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
})

const allowedOpsCount = computed(() => verifyOps.value.filter((o) => o.allowed).length)
const allowedRate = computed(() => (verifyOps.value.length ? Math.round((allowedOpsCount.value / verifyOps.value.length) * 100) : 0))

/** Reduce a URL / path input to the app-relative `rest/...` form the
 *  authorization patterns are written against: optional scheme + host, the
 *  SPA base (/ligoj/), leading slashes and query/hash are stripped. */
function normalizeUrlInput(raw) {
  let v = (raw || '').trim()
  if (!v) return ''
  v = v.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '').replace(/[?#].*$/, '')
  const base = import.meta.env.BASE_URL || '/'
  if (base !== '/' && v.startsWith(base)) v = v.slice(base.length)
  v = v.replace(/^\/+/, '')
  // Anchor on the REST base when present, so any deployment context prefix
  // (/ligoj/, a reverse-proxy path…) is dropped: 'ctx/rest/x' → 'rest/x'.
  const m = /(?:^|\/)(rest(?:\/.*)?)$/.exec(v)
  return m ? m[1] : v
}
const normalizedQuery = computed(() => normalizeUrlInput(verifyQuery.value))

const filteredVerifyOps = computed(() => {
  const q = normalizedQuery.value.toLowerCase()
  if (!q) return verifyOps.value
  return verifyOps.value.filter((o) => {
    const full = `rest${o.path}`.toLowerCase()
    return full.includes(q) || o.templateRe.test(q) || o.summary.toLowerCase().includes(q)
  })
})

// Methods for which the typed URL passes at least one authorization.
const urlAllowedMethods = computed(() => {
  const q = normalizedQuery.value
  if (!q) return []
  const candidates = /^rest(\/|$)/.test(q) ? [q] : [q, `rest/${q}`]
  return METHODS.map((m) => m.toUpperCase()).filter((M) => candidates.some((c) => isAllowedApi(c, M)))
})
const urlAllowed = computed(() => urlAllowedMethods.value.length > 0)

const verifyHeaders = computed(() => [
  { key: 'method', label: t('profile.apiVerifyMethod'), sortable: true, width: '96px' },
  { key: 'path', label: t('profile.apiVerifyPath'), sortable: true },
  { key: 'summary', label: t('profile.apiVerifyDesc'), sortable: false },
  { key: 'allowed', label: t('profile.apiVerifyStatus'), sortable: true, align: 'center', width: '84px' },
])

/* Client-side paging/sorting: VibrantDataTable is server-driven, so slice
 * here from its update:options. The :key remount on filter change resets
 * its internal page — mirror that reset in the options. */
function onVerifyOptions(o) { verifyOptions.value = o }
watch(normalizedQuery, () => { verifyOptions.value = { page: 1, itemsPerPage: 25, sortBy: [] } })
const pagedVerifyOps = computed(() => {
  const { page, itemsPerPage, sortBy } = verifyOptions.value
  const rows = [...filteredVerifyOps.value]
  const s = sortBy && sortBy[0]
  if (s) {
    const dir = s.order === 'desc' ? -1 : 1
    rows.sort((a, b) => (a[s.key] === b[s.key] ? 0 : a[s.key] > b[s.key] ? dir : -dir))
  }
  const start = (page - 1) * itemsPerPage
  return rows.slice(start, start + itemsPerPage)
})

/** Open the native API explorer in a new tab, focused on the operation. */
function openApiExplorer(item) {
  window.open(`${import.meta.env.BASE_URL}#/api?op=${encodeURIComponent(item.key)}`, '_blank', 'noopener')
}
</script>

<style scoped>
/* The content teleports with LjDialog; its card carries `.lj-surface`, so
 * only those tokens are available — with fallbacks for safety. */
.verify-top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}

.verify-rate {
  flex: 1;
}

.verify-rate-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .6));
  margin-bottom: 4px;
}

.verify-feedback {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin: 10px 2px;
}

.verify-feedback.ok {
  color: #1d9d63;
}

.verify-feedback.ko {
  color: #df4d42;
}

.vmethod {
  font-weight: 700;
  letter-spacing: .04em;
  min-width: 58px;
  justify-content: center;
}

.vpath {
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 12.5px;
}

.vsum {
  display: inline-block;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .6));
  vertical-align: middle;
}
</style>
