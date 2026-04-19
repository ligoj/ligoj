<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <h1 class="text-h4">{{ t('containerScope.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">{{ t('containerScope.new') }}</v-btn>
    </div>

    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="group">{{ t('nav.groups') }}</v-tab>
      <v-tab value="company">{{ t('nav.companies') }}</v-tab>
    </v-tabs>

    <v-alert v-if="error" type="warning" variant="tonal" class="mb-4">
      {{ t('containerScope.noProvider') }}
    </v-alert>

    <v-alert v-if="demoMode" type="info" variant="tonal" density="compact" class="mb-4">
      {{ t('containerScope.demoMode') }}
    </v-alert>

    <v-skeleton-loader v-if="loading && items.length === 0" type="table-heading, table-row@5" class="mb-4" />

    <v-data-table
      v-if="!error"
      v-show="items.length > 0 || !loading"
      :headers="headers"
      :items="items"
      :loading="loading"
      item-value="id"
      hover
      @click:row="(_, { item }) => openEdit(item)"
    >
      <template #item.locked="{ item }">
        <v-icon v-if="item.locked" color="warning" size="small">mdi-lock</v-icon>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon size="small" variant="text" @click.stop="openEdit(item)">
          <v-icon size="small">mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" variant="text" color="error" @click.stop="startDelete(item)" :disabled="item.locked">
          <v-icon size="small">mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>

    <!-- Edit/Create dialog -->
    <v-dialog v-model="editDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editTarget?.id ? t('containerScope.edit') : t('containerScope.new') }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field v-model="editForm.name" :label="t('common.name')" :rules="[rules.required]" variant="outlined" class="mb-2" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" @click="save">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('containerScope.deleteTitle') }}</v-card-title>
        <v-card-text>{{ t('containerScope.deleteConfirm', { name: deleteTarget?.name }) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="elevated" :loading="deleting" @click="confirmDelete">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useApi.js'
import { useAppStore } from '@/stores/app.js'
import { useErrorStore } from '@/stores/error.js'
import { useI18nStore } from '@/stores/i18n.js'

const api = useApi()
const appStore = useAppStore()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

const activeTab = ref('group')

const DEMO_GROUP_SCOPES = [
  { id: 1, name: 'Department', locked: false },
  { id: 2, name: 'Team', locked: false },
  { id: 3, name: 'Project', locked: true },
]
const DEMO_COMPANY_SCOPES = [
  { id: 1, name: 'Organization', locked: false },
  { id: 2, name: 'Business Unit', locked: true },
]

const items = ref([])
const totalItems = ref(0)
const loading = ref(false)
const error = ref(null)
const demoMode = ref(false)

const headers = computed(() => [
  { title: t('common.name'), key: 'name', sortable: true },
  { title: t('common.status'), key: 'locked', sortable: false, width: '80px' },
  { title: '', key: 'actions', sortable: false, width: '100px', align: 'end' },
])

const formRef = ref(null)
const editDialog = ref(false)
const editTarget = ref(null)
const editForm = ref({ name: '' })
const saving = ref(false)
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const rules = { required: v => !!v || t('common.required') }

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const data = await api.get(`rest/service/id/container-scope/${activeTab.value}`)
    if (data && !data.code) {
      items.value = Array.isArray(data) ? data : (data.data || [])
      totalItems.value = items.value.length
      demoMode.value = false
    } else {
      demoMode.value = true
      errorStore.clear()
      items.value = activeTab.value === 'group' ? DEMO_GROUP_SCOPES : DEMO_COMPANY_SCOPES
      totalItems.value = items.value.length
    }
  } catch (e) {
    demoMode.value = true
    errorStore.clear()
    items.value = activeTab.value === 'group' ? DEMO_GROUP_SCOPES : DEMO_COMPANY_SCOPES
    totalItems.value = items.value.length
  }
  loading.value = false
}

watch(activeTab, () => {
  loadData()
})

function openNew() {
  editTarget.value = null
  editForm.value = { name: '' }
  editDialog.value = true
}

function openEdit(item) {
  editTarget.value = item
  editForm.value = { name: item.name }
  editDialog.value = true
}

function startDelete(item) {
  deleteTarget.value = item
  deleteDialog.value = true
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  if (demoMode.value) {
    errorStore.push({ message: t('containerScope.demoSave'), status: 0 })
    editDialog.value = false
    return
  }
  saving.value = true
  const payload = { name: editForm.value.name }
  if (editTarget.value?.id) {
    await api.put(`rest/service/id/container-scope/${activeTab.value}`, { id: editTarget.value.id, ...payload })
  } else {
    await api.post(`rest/service/id/container-scope/${activeTab.value}`, payload)
  }
  saving.value = false
  editDialog.value = false
  loadData()
}

async function confirmDelete() {
  if (demoMode.value) {
    errorStore.push({ message: t('containerScope.demoDelete'), status: 0 })
    deleteDialog.value = false
    return
  }
  deleting.value = true
  await api.del(`rest/service/id/container-scope/${activeTab.value}/${deleteTarget.value.id}`)
  deleting.value = false
  deleteDialog.value = false
  loadData()
}

onMounted(() => {
  appStore.setTitle(t('containerScope.title'))
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.identity') },
    { title: t('containerScope.title') },
  ])
  loadData()
})
</script>
