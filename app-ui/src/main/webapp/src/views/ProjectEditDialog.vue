<!--
  ProjectEditDialog — 2026 "Vibrant" create/edit popup for a project. Same
  `.vmodal` chrome as UserEditDialog / DelegateEditDialog (gradient icon head,
  rounded fields, Vibrant footer). Wires to rest/project: POST on create, PUT
  on edit. The pkey is auto-derived from the name (lowercase-dash) until the
  user hand-edits it, and is locked once the project has subscriptions —
  mirrors plugin-ui's ProjectListView rules. Team leader is a user
  autocomplete hitting rest/service/id/user.
-->
<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogModel" max-width="600" scrollable>
    <v-card class="vmodal">
      <div class="vmodal-head">
        <span class="mi"><v-icon color="#fff">mdi-folder-outline</v-icon></span>
        <h3>{{ isEdit ? t('project.edit') : t('project.new') }}</h3>
        <button class="x" :aria-label="t('common.cancel')" @click="requestClose"><v-icon size="20">mdi-close</v-icon></button>
      </div>

      <v-card-text class="vmodal-body">
        <v-form ref="formRef" @submit.prevent="save">
          <v-text-field v-model="form.name" :label="t('project.name')" :rules="[rules.required]" prepend-inner-icon="mdi-form-textbox" variant="outlined" class="mb-2" autofocus @update:model-value="onNameChanged" />
          <v-text-field v-model="form.pkey" :label="t('project.pkey')" :rules="[rules.required, rules.pkey]" :disabled="pkeyLocked" :hint="pkeyLocked ? t('project.pkeyLocked') : t('project.pkeyHint')" persistent-hint
            prepend-inner-icon="mdi-key" variant="outlined" class="mb-2" />
          <v-autocomplete v-model="form.teamLeader" v-model:search="leaderSearch" :label="t('project.teamLeader')" :items="leaderDisplayItems" item-title="label" item-value="id" :loading="leaderLoading"
            :rules="[rules.required]" :hint="t('project.teamLeaderHint')" persistent-hint prepend-inner-icon="mdi-account-star" no-filter clearable auto-select-first variant="outlined" class="mb-2"
            autocomplete="off" @update:search="onLeaderSearch" @update:menu="onLeaderMenu" />
          <v-textarea v-model="form.description" :label="t('project.description')" rows="3" prepend-inner-icon="mdi-text-long" variant="outlined" class="mb-2" />
        </v-form>
      </v-card-text>

      <div class="vmodal-foot">
        <span class="foot-sp" />
        <button class="mbtn ghost" @click="requestClose">{{ t('common.cancel') }}</button>
        <button class="mbtn primary" :disabled="saving" @click="save">
          <span v-if="saving" class="mspin" aria-hidden="true" /><v-icon v-else size="18">mdi-content-save</v-icon>{{ t('common.save') }}
        </button>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useApi, useI18nStore } from '@ligoj/host'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // Existing project to edit (with id/name/pkey/teamLeader/description and
  // nbSubscriptions for the pkey lock); null/absent means create mode.
  project: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const api = useApi()
const i18n = useI18nStore()
const t = i18n.t

const formRef = ref(null)
const saving = ref(false)

const isEdit = computed(() => !!props.project?.id)
const pkeyLocked = computed(() => isEdit.value && (props.project?.nbSubscriptions || 0) > 0)

const form = ref({ name: '', pkey: '', teamLeader: '', description: '' })
let lastPkeyAuto = ''

const rules = {
  required: (v) => !!v || t('common.required'),
  pkey: (v) => /^[a-z0-9][-a-z0-9]{0,99}$/.test(v || '') || t('project.pkeyRule'),
}

/* Slugify a name into a candidate pkey: strip accents, lowercase, collapse
   non-alphanumerics into single dashes. Mirrors plugin-ui's `normalize`. */
function slugify(name) {
  return (name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
function onNameChanged() {
  if (pkeyLocked.value) return
  // Only auto-fill while the user hasn't hand-edited the pkey.
  if (!form.value.pkey || form.value.pkey === lastPkeyAuto) {
    const pk = slugify(form.value.name)
    form.value.pkey = pk
    lastPkeyAuto = pk
  }
}

/* ---- Team-leader autocomplete (users) ---- */
const leaderItems = ref([])
const leaderSearch = ref('')
const leaderLoading = ref(false)
let leaderTimer = null

const leaderDisplayItems = computed(() => {
  const cur = form.value.teamLeader
  const items = leaderItems.value
  if (cur && !items.find((i) => i.id === cur)) return [{ id: cur, label: cur }, ...items]
  return items
})

async function loadLeaders() {
  leaderLoading.value = true
  try {
    const q = (leaderSearch.value || '').trim()
    const qp = q ? `q=${encodeURIComponent(q)}&` : ''
    const data = await api.get(`rest/service/id/user?${qp}rows=20`)
    const rows = Array.isArray(data) ? data : (data?.data || [])
    leaderItems.value = rows.map((r) => {
      const full = [r.firstName, r.lastName].filter(Boolean).join(' ')
      return { id: r.id, label: full ? `${r.id} — ${full}` : r.id }
    })
  } finally { leaderLoading.value = false }
}
function onLeaderSearch(q) {
  if (leaderDisplayItems.value.some((i) => i.label === q)) return
  clearTimeout(leaderTimer)
  leaderTimer = setTimeout(loadLeaders, 250)
}
function onLeaderMenu(open) {
  if (open && leaderItems.value.length === 0) loadLeaders()
}

function resetForm() {
  const p = props.project
  form.value = {
    name: p?.name || '',
    pkey: p?.pkey || '',
    teamLeader: p?.teamLeader?.id || p?.teamLeader || '',
    description: p?.description || '',
  }
  lastPkeyAuto = p?.pkey || ''
  leaderItems.value = []
  leaderSearch.value = ''
  formRef.value?.resetValidation()
}

watch(() => props.modelValue, (val) => { if (val) resetForm() })

function onDialogModel(val) { if (!val) requestClose() }
function requestClose() { emit('update:modelValue', false) }

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    const payload = {
      id: props.project?.id,
      name: form.value.name,
      pkey: form.value.pkey,
      teamLeader: form.value.teamLeader,
      description: form.value.description,
    }
    const id = await api[isEdit.value ? 'put' : 'post']('rest/project', payload)
    emit('saved', { id: isEdit.value ? props.project.id : id, created: !isEdit.value })
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* Vibrant dialog chrome — shared language with UserEditDialog /
   DelegateEditDialog. Vars on the .vmodal card so they reach the teleported
   dialog content. */
.vmodal {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .5);
  --border: rgba(var(--v-theme-on-surface), .14);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  border-radius: 20px !important;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important;
}
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 8px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 20px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; }
.vmodal-head .x { width: 36px; height: 36px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); }
.vmodal-head .x:hover { background: var(--hover); color: var(--ink); }
.vmodal-body { padding: 12px 24px 6px !important; }
.vmodal :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.vmodal :deep(.v-field__prepend-inner .v-icon) { opacity: .55; }
.vmodal :deep(.v-label) { font-weight: 600; }

.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 14px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn.ghost:hover:not(:disabled) { background: var(--hover); border-color: var(--border-2); }
.mbtn:disabled { opacity: .6; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: dspin .7s linear infinite; }
@keyframes dspin { to { transform: rotate(360deg); } }
</style>
