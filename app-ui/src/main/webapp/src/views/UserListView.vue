<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <h1 class="text-h4">{{ t('user.title') }}</h1>
      <v-spacer />
      <v-text-field
        v-model="dt.search.value"
        prepend-inner-icon="mdi-magnify"
        :label="t('common.search')"
        variant="outlined"
        density="compact"
        hide-details
        class="search-field"
        @update:model-value="onSearch"
      />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="router.push('/id/user/new')">
        {{ t('user.new') }}
      </v-btn>
      <ImportExportBar
        export-endpoint="service/id/user"
        import-endpoint="service/id/user/import/csv/full"
        export-filename="users.csv"
        @imported="dt.load({ page: 1, itemsPerPage: itemsPerPage.value })"
      />
    </div>

    <v-alert v-if="dt.error.value" type="warning" variant="tonal" class="mb-4">
      <v-alert-title>{{ t('user.noProvider') }}</v-alert-title>
      {{ dt.error.value === 'internal' ? t('user.noProviderMsg') : dt.error.value }}
    </v-alert>

    <v-alert v-if="dt.demoMode.value" type="info" variant="tonal" density="compact" class="mb-4">
      {{ t('user.demoMode') }}
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
      @click:row="(_, { item }) => router.push('/id/user/' + item.id)"
    >
      <template #item.mails="{ item }">
        {{ item.mails?.[0] || '' }}
      </template>
      <template #item.groups="{ item }">
        <v-chip
          v-for="g in (item.groups || []).slice(0, 3)"
          :key="g.name || g"
          size="small"
          class="mr-1"
        >{{ g.name || g }}</v-chip>
        <span v-if="(item.groups || []).length > 3" class="text-caption text-medium-emphasis">
          +{{ item.groups.length - 3 }}
        </span>
      </template>
      <template #item.locked="{ item }">
        <v-icon v-if="item.locked" color="error" size="small">mdi-lock</v-icon>
        <v-icon v-else color="success" size="small">mdi-lock-open-variant</v-icon>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon size="small" variant="text" @click.stop="router.push('/id/user/' + item.id)">
          <v-icon size="small">mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" variant="text" color="error" @click.stop="startDelete(item)">
          <v-icon size="small">mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table-server>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('user.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ t('user.deleteConfirm', { id: deleteTarget?.id }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="elevated" :loading="deleting" @click="confirmDeleteUser">{{ t('common.delete') }}</v-btn>
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
import { useErrorStore } from '@/stores/error.js'
import { useI18nStore } from '@/stores/i18n.js'
import ImportExportBar from '@/components/ImportExportBar.vue'

const router = useRouter()
const appStore = useAppStore()
const api = useApi()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t
const DEMO_USERS = [
  { id: 'admin', firstName: 'Admin', lastName: 'User', company: 'Ligoj', mails: ['admin@ligoj.org'], groups: [{ name: 'Engineering' }, { name: 'Management' }], locked: false },
  { id: 'jdupont', firstName: 'Jean', lastName: 'Dupont', company: 'Ligoj', mails: ['jean.dupont@ligoj.org'], groups: [{ name: 'Engineering' }, { name: 'DevOps' }], locked: false },
  { id: 'mmartin', firstName: 'Marie', lastName: 'Martin', company: 'AcmeCorp', mails: ['marie.martin@acme.com'], groups: [{ name: 'Marketing' }], locked: false },
  { id: 'pdurand', firstName: 'Pierre', lastName: 'Durand', company: 'AcmeCorp', mails: ['pierre.durand@acme.com'], groups: [{ name: 'Engineering' }], locked: false },
  { id: 'sleblanc', firstName: 'Sophie', lastName: 'Leblanc', company: 'TechSolutions', mails: ['sophie.leblanc@techsol.com'], groups: [{ name: 'DevOps' }], locked: false },
  { id: 'tmoreau', firstName: 'Thomas', lastName: 'Moreau', company: 'TechSolutions', mails: ['thomas.moreau@techsol.com'], groups: [{ name: 'Sales' }], locked: false },
  { id: 'crichard', firstName: 'Claire', lastName: 'Richard', company: 'Ligoj', mails: ['claire.richard@ligoj.org'], groups: [{ name: 'Management' }], locked: false },
  { id: 'agarcia', firstName: 'Antoine', lastName: 'Garcia', company: 'Ligoj', mails: ['antoine.garcia@ligoj.org'], groups: [{ name: 'Engineering' }], locked: false },
]
const dt = useDataTable('service/id/user', { defaultSort: 'id', demoData: DEMO_USERS })
const itemsPerPage = ref(25)
let searchTimeout = null

const selected = ref([])
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const bulkDeleteDialog = ref(false)

const headers = computed(() => [
  { title: t('user.login'), key: 'id', sortable: true },
  { title: t('user.firstName'), key: 'firstName', sortable: true },
  { title: t('user.lastName'), key: 'lastName', sortable: true },
  { title: t('user.company'), key: 'company', sortable: true },
  { title: t('user.email'), key: 'mails', sortable: false },
  { title: t('user.groups'), key: 'groups', sortable: false },
  { title: t('common.status'), key: 'locked', sortable: false, width: '80px' },
  { title: '', key: 'actions', sortable: false, width: '100px', align: 'end' },
])

function loadData(options) {
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

async function confirmDeleteUser() {
  if (dt.demoMode.value) {
    errorStore.push({ message: t('user.demoDelete'), status: 0 })
    deleteDialog.value = false
    return
  }
  deleting.value = true
  await api.del(`rest/service/id/user/${deleteTarget.value.id}`)
  deleting.value = false
  deleteDialog.value = false
  deleteTarget.value = null
  dt.load({ page: 1, itemsPerPage: itemsPerPage.value })
}

function startBulkDelete() {
  bulkDeleteDialog.value = true
}

async function confirmBulkDelete() {
  if (dt.demoMode.value) {
    errorStore.push({ message: t('user.demoDelete'), status: 0 })
    bulkDeleteDialog.value = false
    return
  }
  deleting.value = true
  for (const id of selected.value) {
    await api.del(`rest/service/id/user/${id}`)
  }
  deleting.value = false
  bulkDeleteDialog.value = false
  selected.value = []
  dt.load({ page: 1, itemsPerPage: itemsPerPage.value })
}

onMounted(() => {
  appStore.setTitle(t('user.title'))
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.identity') },
    { title: t('user.title') },
  ])
})
</script>

<style scoped>
.search-field {
  min-width: 200px;
  max-width: 300px;
  flex: 1 1 200px;
}
</style>
