<template>
  <v-card>
    <!-- Cost Summary Header -->
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon color="teal" class="mr-2">mdi-cloud-outline</v-icon>
        <span>{{ t('service.prov') }}</span>
      </div>
      <div v-if="!store.state.loading" class="d-flex ga-4">
        <div class="text-center">
          <div class="text-h5 font-weight-bold">{{ formattedCost }}</div>
          <div class="text-caption text-medium-emphasis">{{ t('service.prov.monthlyCost') }}</div>
        </div>
        <div class="text-center">
          <div class="text-h6">{{ store.totalResources }}</div>
          <div class="text-caption text-medium-emphasis">{{ t('service.prov.resources') }}</div>
        </div>
      </div>
    </v-card-title>

    <v-card-text>
      <v-progress-linear v-if="store.state.loading" indeterminate color="primary" />
      <v-alert v-else-if="store.state.error" type="error" class="mb-4">{{ store.state.error }}</v-alert>

      <v-row v-else>
        <!-- Main content -->
        <v-col cols="12" md="9">
          <!-- Resource Tabs -->
          <v-tabs v-model="activeTab" color="primary" density="compact">
            <v-tab v-for="rt in RESOURCE_TYPES" :key="rt.key" :value="rt.key">
              <v-icon :color="rt.color" class="mr-1" size="small">{{ rt.icon }}</v-icon>
              {{ t(`service.prov.${rt.key}`) }}
              <v-badge v-if="resourceCount(rt.key)" :content="resourceCount(rt.key)" color="grey" inline />
            </v-tab>
          </v-tabs>

          <v-tabs-window v-model="activeTab">
            <v-tabs-window-item v-for="rt in RESOURCE_TYPES" :key="rt.key" :value="rt.key">
              <v-data-table
                :headers="getHeaders(rt.key)"
                :items="getResources(rt.key)"
                :items-per-page="10"
                density="compact"
                hover
                class="mt-2"
              >
                <!-- Name column -->
                <template #item.name="{ item }">
                  <span class="font-weight-medium">{{ item.name }}</span>
                </template>
                <!-- Cost column -->
                <template #item.cost="{ item }">
                  {{ formatCost(item.cost, store.currency) }}
                </template>
                <!-- CPU column (instances, databases, containers) -->
                <template #item.cpu="{ item }">{{ formatCpu(item.cpu) }}</template>
                <!-- RAM column -->
                <template #item.ram="{ item }">{{ formatRam(item.ram) }}</template>
                <!-- OS column (instances) -->
                <template #item.os="{ item }">
                  <v-icon size="small">{{ getOsIcon(item.os) }}</v-icon> {{ formatOs(item.os) }}
                </template>
                <!-- Engine column (databases) -->
                <template #item.engine="{ item }">
                  <v-icon size="small">{{ getDbIcon(item.engine) }}</v-icon> {{ formatEngine(item.engine) }}
                </template>
                <!-- Storage size column -->
                <template #item.size="{ item }">{{ formatStorage(item.size) }}</template>
                <!-- Quantity column -->
                <template #item.quantity="{ item }">{{ item.quantity || 1 }}</template>
                <!-- Actions -->
                <template #item.actions="{ item }">
                  <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="editResource(rt.key, item)" />
                  <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click="copyResource(rt.key, item)" />
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="confirmDelete(rt.key, item)" />
                </template>
                <!-- Empty state -->
                <template #no-data>
                  <div class="text-center pa-4 text-medium-emphasis">
                    <v-icon size="48" color="grey-lighten-1">{{ rt.icon }}</v-icon>
                    <p class="mt-2">{{ t('service.prov.noResources') }}</p>
                    <v-btn color="primary" variant="text" @click="addResource(rt.key)">
                      <v-icon class="mr-1">mdi-plus</v-icon> {{ t('common.add') }}
                    </v-btn>
                  </div>
                </template>
              </v-data-table>

              <v-btn color="primary" variant="tonal" class="mt-2" @click="addResource(rt.key)">
                <v-icon class="mr-1">mdi-plus</v-icon> {{ t('common.add') }} {{ t(`service.prov.${rt.key}`) }}
              </v-btn>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-col>

        <!-- Sidebar: Assumptions & Charts -->
        <v-col cols="12" md="3">
          <!-- Location -->
          <v-select v-model="location" :items="locations" :label="t('service.prov.location')" density="compact" class="mb-2" />
          <!-- Usage profile -->
          <v-select v-model="usage" :items="usages" :label="t('service.prov.usage')" density="compact" class="mb-2" />
          <!-- Budget -->
          <v-select v-model="budget" :items="budgets" :label="t('service.prov.budget')" density="compact" class="mb-2" />
          <!-- License -->
          <v-select v-model="license" :items="licenseOptions" :label="t('service.prov.license')" density="compact" class="mb-4" />

          <!-- Cost Donut -->
          <DonutChart v-if="costSegments.length" :segments="costSegments" :size="180" />

          <!-- Efficiency Gauges -->
          <div class="d-flex justify-space-around mt-4">
            <GaugeChart :value="cpuEfficiency" :size="80" :label="t('service.prov.cpu')" color="blue" />
            <GaugeChart :value="ramEfficiency" :size="80" :label="t('service.prov.ram')" color="green" />
          </div>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Resource Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="600">
      <v-card>
        <v-card-title>{{ editingResource?.id ? t('common.edit') : t('common.add') }} {{ t(`service.prov.${editingType}`) }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="editingResource.name" :label="t('common.name')" density="compact" class="mb-2" />
          <!-- Dynamic fields based on resource type -->
          <template v-if="editingType === 'instance' || editingType === 'database' || editingType === 'container'">
            <v-text-field v-model.number="editingResource.cpu" :label="t('service.prov.cpu')" type="number" density="compact" class="mb-2" />
            <v-text-field v-model.number="editingResource.ram" :label="t('service.prov.ram')" type="number" suffix="MB" density="compact" class="mb-2" />
          </template>
          <template v-if="editingType === 'instance'">
            <v-select v-model="editingResource.os" :items="['LINUX', 'WINDOWS', 'SUSE', 'RHEL']" :label="t('service.prov.os')" density="compact" class="mb-2" />
          </template>
          <template v-if="editingType === 'database'">
            <v-select v-model="editingResource.engine" :items="['MYSQL', 'POSTGRESQL', 'ORACLE', 'SQL_SERVER', 'MARIADB']" :label="t('service.prov.engine')" density="compact" class="mb-2" />
          </template>
          <template v-if="editingType === 'function'">
            <v-text-field v-model.number="editingResource.ram" :label="t('service.prov.ram')" type="number" suffix="MB" density="compact" class="mb-2" />
            <v-text-field v-model.number="editingResource.requests" label="Requests/mo" type="number" density="compact" class="mb-2" />
            <v-text-field v-model.number="editingResource.duration" label="Duration (ms)" type="number" density="compact" class="mb-2" />
          </template>
          <template v-if="editingType === 'storage'">
            <v-text-field v-model.number="editingResource.size" :label="t('service.prov.size')" type="number" suffix="GB" density="compact" class="mb-2" />
            <v-select v-model="editingResource.optimized" :items="['IOPS', 'THROUGHPUT', 'DURABILITY']" :label="t('service.prov.optimized')" density="compact" class="mb-2" />
          </template>
          <template v-if="editingType === 'support'">
            <v-select v-model="editingResource.level" :items="['BASIC', 'DEVELOPER', 'BUSINESS', 'ENTERPRISE']" :label="t('service.prov.level')" density="compact" class="mb-2" />
            <v-text-field v-model.number="editingResource.seats" label="Seats" type="number" density="compact" class="mb-2" />
          </template>
          <v-text-field v-model.number="editingResource.quantity" label="Quantity" type="number" min="1" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="editDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveResource">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('common.delete') }}</v-card-title>
        <v-card-text>{{ t('service.prov.deleteConfirm', { name: deletingResource?.name }) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" :loading="deleting" @click="doDelete">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProvStore } from './useProvStore.js'
import { useProvApi } from './useProvApi.js'
import { formatCost, formatCpu, formatRam, formatStorage, formatOs, formatEngine, getOsIcon, getDbIcon, RESOURCE_TYPES, formatCostRange } from './provFormatters.js'
import DonutChart from './charts/DonutChart.vue'
import GaugeChart from './charts/GaugeChart.vue'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  subscription: { type: Number, required: true }
})

const store = useProvStore()
const api = useProvApi()
const { t } = useI18nStore()

const activeTab = ref('instance')
const editDialog = ref(false)
const deleteDialog = ref(false)
const editingType = ref('')
const editingResource = ref({})
const deletingResource = ref(null)
const deletingType = ref('')
const saving = ref(false)
const deleting = ref(false)

// Assumptions
const location = ref(null)
const usage = ref(null)
const budget = ref(null)
const license = ref(null)

const locations = ref([])
const usages = ref([])
const budgets = ref([])
const licenseOptions = ref(['INCLUDED', 'BYOL'])

const formattedCost = computed(() => formatCostRange(store.cost, store.currency))

function getResources(type) {
  return store[type + 's'] || []
}

function resourceCount(type) {
  return getResources(type).length
}

function getHeaders(type) {
  const common = [
    { title: t('common.name'), key: 'name', align: 'start' },
  ]
  const specific = []

  if (type === 'instance') {
    specific.push(
      { title: t('service.prov.cpu'), key: 'cpu', align: 'end' },
      { title: t('service.prov.ram'), key: 'ram', align: 'end' },
      { title: t('service.prov.os'), key: 'os', align: 'start' },
      { title: t('service.prov.quantity'), key: 'quantity', align: 'end' }
    )
  } else if (type === 'database') {
    specific.push(
      { title: t('service.prov.cpu'), key: 'cpu', align: 'end' },
      { title: t('service.prov.ram'), key: 'ram', align: 'end' },
      { title: t('service.prov.engine'), key: 'engine', align: 'start' },
      { title: t('service.prov.quantity'), key: 'quantity', align: 'end' }
    )
  } else if (type === 'container') {
    specific.push(
      { title: t('service.prov.cpu'), key: 'cpu', align: 'end' },
      { title: t('service.prov.ram'), key: 'ram', align: 'end' },
      { title: t('service.prov.quantity'), key: 'quantity', align: 'end' }
    )
  } else if (type === 'function') {
    specific.push(
      { title: t('service.prov.ram'), key: 'ram', align: 'end' },
      { title: 'Requests', key: 'requests', align: 'end' },
      { title: 'Duration', key: 'duration', align: 'end' }
    )
  } else if (type === 'storage') {
    specific.push(
      { title: t('service.prov.size'), key: 'size', align: 'end' },
      { title: t('service.prov.optimized'), key: 'optimized', align: 'start' }
    )
  } else if (type === 'support') {
    specific.push(
      { title: t('service.prov.level'), key: 'level', align: 'start' },
      { title: 'Seats', key: 'seats', align: 'end' }
    )
  }

  return [
    ...common,
    ...specific,
    { title: t('service.prov.cost'), key: 'cost', align: 'end' },
    { title: t('common.actions'), key: 'actions', align: 'center', sortable: false }
  ]
}

function addResource(type) {
  editingType.value = type
  editingResource.value = {
    name: '',
    quantity: 1,
    cpu: type === 'instance' || type === 'database' || type === 'container' ? 2 : undefined,
    ram: type === 'function' ? 512 : type === 'instance' || type === 'database' || type === 'container' ? 2048 : undefined,
    os: type === 'instance' ? 'LINUX' : undefined,
    engine: type === 'database' ? 'MYSQL' : undefined,
    size: type === 'storage' ? 10 : undefined,
    optimized: type === 'storage' ? 'IOPS' : undefined,
    level: type === 'support' ? 'BASIC' : undefined,
    seats: type === 'support' ? 1 : undefined,
    requests: type === 'function' ? 1000000 : undefined,
    duration: type === 'function' ? 200 : undefined
  }
  editDialog.value = true
}

function editResource(type, item) {
  editingType.value = type
  editingResource.value = { ...item }
  editDialog.value = true
}

function copyResource(type, item) {
  editingType.value = type
  editingResource.value = { ...item, id: undefined, name: `${item.name} (copy)` }
  editDialog.value = true
}

function confirmDelete(type, item) {
  deletingType.value = type
  deletingResource.value = item
  deleteDialog.value = true
}

async function saveResource() {
  saving.value = true
  try {
    if (editingResource.value.id) {
      await api.updateResource(props.subscription, editingType.value, editingResource.value.id, editingResource.value)
      store.updateResource(editingType.value, editingResource.value.id, editingResource.value)
    } else {
      const result = await api.createResource(props.subscription, editingType.value, editingResource.value)
      store.addResource(editingType.value, result)
    }
    await refreshQuote()
    editDialog.value = false
  } catch (err) {
    store.setError(err.message || 'Failed to save resource')
  } finally {
    saving.value = false
  }
}

async function doDelete() {
  deleting.value = true
  try {
    await api.deleteResource(props.subscription, deletingType.value, deletingResource.value.id)
    store.removeResource(deletingType.value, deletingResource.value.id)
    await refreshQuote()
    deleteDialog.value = false
  } catch (err) {
    store.setError(err.message || 'Failed to delete resource')
  } finally {
    deleting.value = false
  }
}

async function refreshQuote() {
  try {
    const quote = await api.refreshQuote(props.subscription)
    store.setQuote(quote)
  } catch (err) {
    store.setError(err.message || 'Failed to refresh quote')
  }
}

const costSegments = computed(() => {
  const segments = []
  RESOURCE_TYPES.forEach(rt => {
    const resources = getResources(rt.key)
    if (resources.length) {
      const total = resources.reduce((sum, r) => sum + (r.cost || 0) * (r.quantity || 1), 0)
      if (total > 0) {
        segments.push({
          label: t(`service.prov.${rt.key}`),
          value: total,
          color: rt.color
        })
      }
    }
  })
  return segments
})

const cpuEfficiency = computed(() => {
  const instances = [...store.instances, ...store.databases, ...store.containers]
  if (!instances.length) return 0
  const totalCpu = instances.reduce((sum, i) => sum + (i.cpu || 0), 0)
  const maxCpu = instances.length * 64
  return Math.min(100, Math.round((totalCpu / maxCpu) * 100))
})

const ramEfficiency = computed(() => {
  const instances = [...store.instances, ...store.databases, ...store.containers, ...store.functions]
  if (!instances.length) return 0
  const totalRam = instances.reduce((sum, i) => sum + (i.ram || 0), 0)
  const maxRam = instances.length * 256 * 1024
  return Math.min(100, Math.round((totalRam / maxRam) * 100))
})

onMounted(async () => {
  store.setLoading(true)
  try {
    const quote = await api.getQuote(props.subscription)
    store.setQuote(quote)
    store.setSubscription(props.subscription)

    location.value = quote.location?.name
    usage.value = quote.usage?.name
    budget.value = quote.budget?.name
    license.value = quote.license

    locations.value = [quote.location?.name].filter(Boolean)
    usages.value = [quote.usage?.name].filter(Boolean)
    budgets.value = [quote.budget?.name].filter(Boolean)
  } catch (err) {
    store.setError(err.message || 'Failed to load quote')
  } finally {
    store.setLoading(false)
  }
})
</script>

<style scoped>
.v-data-table {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
