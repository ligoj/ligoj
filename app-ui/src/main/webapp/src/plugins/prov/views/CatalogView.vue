<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-book-open-page-variant</v-icon>
      {{ t('service.prov.catalog') }}
    </v-card-title>
    <v-card-text>
      <v-data-table :headers="headers" :items="catalogs" :loading="loading" density="compact" hover>
        <template #item.lastSuccess="{ item }">
          {{ item.lastSuccess ? new Date(item.lastSuccess).toLocaleDateString() : '-' }}
        </template>
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" size="small">{{ item.status || 'Ready' }}</v-chip>
        </template>
        <template #item.co2="{ item }">
          <v-progress-linear :model-value="item.co2 || 0" :color="item.co2 > 50 ? 'green' : 'orange'" height="8" rounded />
          <span class="text-caption">{{ item.co2 || 0 }}%</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-refresh" size="x-small" variant="text" :loading="item._importing" @click="importCatalog(item)" :title="t('service.prov.catalog.import')" />
          <v-btn icon="mdi-map-marker" size="x-small" variant="text" @click="editLocation(item)" :title="t('service.prov.catalog.location')" />
        </template>
      </v-data-table>
    </v-card-text>
    <v-dialog v-model="locationDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('service.prov.catalog.preferredLocation') }}</v-card-title>
        <v-card-text>
          <v-select v-model="selectedLocation" :items="locations" :label="t('service.prov.location')" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="locationDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" @click="saveLocation">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProvApi } from '../useProvApi.js'
import { useI18nStore } from '@/stores/i18n'

const { t } = useI18nStore()
const { getCatalogs, importCatalog: apiImportCatalog, getLocations, setPreferredLocation } = useProvApi()

const catalogs = ref([])
const loading = ref(false)
const locationDialog = ref(false)
const selectedLocation = ref(null)
const locations = ref([])
const currentCatalog = ref(null)

const headers = [
  { title: t('service.prov.provider'), key: 'node.id', sortable: true },
  { title: t('common.name'), key: 'name', sortable: true },
  { title: t('service.prov.catalog.lastImport'), key: 'lastSuccess', sortable: true },
  { title: t('service.prov.locations'), key: 'nbLocations', sortable: true },
  { title: t('service.prov.instanceTypes'), key: 'nbInstanceTypes', sortable: true },
  { title: t('service.prov.prices'), key: 'nbPrices', sortable: true },
  { title: 'CO2', key: 'co2', sortable: true },
  { title: t('common.status'), key: 'status', sortable: false },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
]

const statusColor = (status) => {
  if (!status || status === 'Ready') return 'success'
  if (status === 'importing') return 'warning'
  return 'error'
}

const importCatalog = async (catalog) => {
  catalog._importing = true
  try {
    await apiImportCatalog(catalog.node.id)
    await pollImportStatus(catalog)
  } finally {
    catalog._importing = false
  }
}

const pollImportStatus = async (catalog) => {
  const interval = setInterval(async () => {
    const updated = await getCatalogs()
    const current = updated.find(c => c.node.id === catalog.node.id)
    if (current && current.status !== 'importing') {
      Object.assign(catalog, current)
      clearInterval(interval)
    }
  }, 2000)
}

const editLocation = async (catalog) => {
  currentCatalog.value = catalog
  locations.value = await getLocations(catalog.node.id)
  locationDialog.value = true
}

const saveLocation = async () => {
  await setPreferredLocation(currentCatalog.value.node.id, selectedLocation.value)
  locationDialog.value = false
  await loadCatalogs()
}

const loadCatalogs = async () => {
  loading.value = true
  try {
    catalogs.value = await getCatalogs()
  } finally {
    loading.value = false
  }
}

onMounted(loadCatalogs)
</script>
