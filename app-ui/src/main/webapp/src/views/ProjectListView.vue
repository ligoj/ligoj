<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ t('project.title') }}</h1>
      <v-spacer />
      <v-text-field
        v-model="dt.search.value"
        prepend-inner-icon="mdi-magnify"
        :label="t('common.search')"
        variant="outlined"
        density="compact"
        hide-details
        class="search-field mr-3"
        @update:model-value="onSearch"
      />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="router.push('/home/project/new')">
        {{ t('project.new') }}
      </v-btn>
      <ImportExportBar
        export-endpoint="project"
        export-filename="projects.csv"
        @imported="dt.load(lastOptions)"
      />
    </div>

    <v-alert v-if="dt.error.value" type="warning" variant="tonal" class="mb-4">
      {{ dt.error.value }}
    </v-alert>

    <v-slide-y-transition>
      <v-toolbar v-if="selected.length" density="compact" color="primary" rounded class="mb-4">
        <v-toolbar-title>{{ selected.length }} {{ t('common.selected') }}</v-toolbar-title>
        <v-spacer />
        <v-btn variant="elevated" color="error" prepend-icon="mdi-delete" @click="startBulkDelete">
          {{ t('common.delete') }}
        </v-btn>
      </v-toolbar>
    </v-slide-y-transition>

    <v-skeleton-loader
      v-if="dt.loading.value && dt.items.value.length === 0"
      type="table-heading, table-row@5"
      class="mb-4"
    />

    <v-data-table-server
      v-if="!dt.error.value"
      v-show="dt.items.value.length > 0 || !dt.loading.value"
      v-model="selected"
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items="dt.items.value"
      :items-length="dt.totalItems.value"
      :loading="dt.loading.value"
      item-value="id"
      show-select
      hover
      @update:options="loadData"
      @click:row="(_, { item }) => router.push('/home/project/' + item.id)"
    >
      <template #item.teamLeader="{ item }">
        {{ item.teamLeader?.id || '-' }}
      </template>
      <template #item.actions="{ item }">
        <v-btn icon size="small" variant="text" @click.stop="router.push('/home/project/' + item.id + '/edit')">
          <v-icon size="small">mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" variant="text" color="error" @click.stop="startDelete(item)">
          <v-icon size="small">mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table-server>

    <v-alert v-if="!dt.loading.value && !dt.error.value && dt.totalItems.value === 0" type="info" variant="tonal" class="mt-4">
      {{ t('project.empty') }}
    </v-alert>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('project.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ t('project.deleteConfirm', { name: deleteTarget?.name }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="elevated" :loading="deleting" @click="confirmDelete">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="bulkDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('common.bulkDeleteTitle') }}</v-card-title>
        <v-card-text>{{ t('common.bulkDeleteConfirm', { count: selected.length }) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="bulkDeleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="elevated" :loading="deleting" @click="confirmBulkDelete">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataTable } from '@/composables/useDataTable.js'
import { useApi } from '@/composables/useApi.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'
import ImportExportBar from '@/components/ImportExportBar.vue'

const router = useRouter()
const appStore = useAppStore()
const api = useApi()
const i18n = useI18nStore()
const t = i18n.t
const dt = useDataTable('project', { defaultSort: 'name' })
const itemsPerPage = ref(25)
let searchTimeout = null

const selected = ref([])
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const bulkDeleteDialog = ref(false)
let lastOptions = {}

const headers = computed(() => [
  { title: t('common.name'), key: 'name', sortable: true },
  { title: t('project.description'), key: 'description', sortable: false },
  { title: t('project.teamLeader'), key: 'teamLeader', sortable: false },
  { title: t('project.pkey'), key: 'pkey', sortable: true },
  { title: '', key: 'actions', sortable: false, width: '100px', align: 'end' },
])

function loadData(options) {
  lastOptions = options
  dt.load(options)
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => dt.load({ page: 1, itemsPerPage: itemsPerPage.value }), 300)
}

function startDelete(item) {
  deleteTarget.value = item
  deleteDialog.value = true
}

async function confirmDelete() {
  deleting.value = true
  await api.del(`rest/project/${deleteTarget.value.id}`)
  deleting.value = false
  deleteDialog.value = false
  deleteTarget.value = null
  dt.load(lastOptions)
}

function startBulkDelete() {
  bulkDeleteDialog.value = true
}

async function confirmBulkDelete() {
  deleting.value = true
  for (const id of selected.value) {
    await api.del(`rest/project/${id}`)
  }
  deleting.value = false
  bulkDeleteDialog.value = false
  selected.value = []
  dt.load(lastOptions)
}

onMounted(() => {
  appStore.setTitle(t('project.title'))
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('project.title') },
  ])
})
</script>

<style scoped>
.search-field {
  max-width: 300px;
}
</style>
