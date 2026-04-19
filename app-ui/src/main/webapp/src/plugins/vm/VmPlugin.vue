<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon color="teal" class="mr-2">mdi-server</v-icon>
      Virtual Machine
      <v-spacer />
      <v-chip :color="statusColor" variant="tonal">
        <v-icon start>{{ statusIcon }}</v-icon>
        {{ statusText }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <div class="d-flex flex-wrap ga-2 mb-4">
        <v-btn v-for="op in operations" :key="op.value" :color="op.color" variant="outlined" size="small"
          @click="executeOp(op.value)" :disabled="!canExecute(op.value)" :loading="executing === op.value"
          :prepend-icon="op.icon">
          {{ op.label }}
        </v-btn>
      </div>

      <v-tabs v-model="activeTab">
        <v-tab value="schedules">Schedules</v-tab>
        <v-tab value="snapshots">Snapshots</v-tab>
      </v-tabs>

      <v-tabs-window v-model="activeTab">
        <v-tabs-window-item value="schedules">
          <div class="d-flex justify-end my-2">
            <v-btn color="primary" size="small" @click="openScheduleDialog()" prepend-icon="mdi-plus">Add Schedule</v-btn>
          </div>
          <v-data-table :items="schedules" :headers="scheduleHeaders" density="compact">
            <template #item.operation="{ item }">
              <v-chip size="small" :color="getOpColor(item.operation)">{{ item.operation }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon size="small" @click="openScheduleDialog(item)"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn icon size="small" color="error" @click="removeSchedule(item)"><v-icon>mdi-delete</v-icon></v-btn>
            </template>
          </v-data-table>
        </v-tabs-window-item>

        <v-tabs-window-item value="snapshots">
          <div class="d-flex justify-end my-2">
            <v-btn color="primary" size="small" @click="createSnap" :loading="creatingSnapshot" prepend-icon="mdi-camera">
              Create Snapshot
            </v-btn>
          </div>
          <v-data-table :items="snapshots" :headers="snapshotHeaders" density="compact">
            <template #item.date="{ item }">{{ formatDate(item.date) }}</template>
            <template #item.status="{ item }">
              <v-icon v-if="item.available" color="success">mdi-check-circle</v-icon>
              <v-progress-circular v-else indeterminate size="16" width="2" />
            </template>
            <template #item.volumes="{ item }">
              {{ item.volumes?.length || 0 }} ({{ formatSize(item.volumes) }})
            </template>
            <template #item.actions="{ item }">
              <v-btn icon size="small" color="error" @click="removeSnapshot(item)" :disabled="!item.available">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
  </v-card>

  <v-dialog v-model="showScheduleDialog" max-width="500">
    <v-card>
      <v-card-title>{{ editingSchedule.id ? 'Edit' : 'New' }} Schedule</v-card-title>
      <v-card-text>
        <v-select v-model="editingSchedule.operation" :items="operationItems" label="Operation" />
        <v-text-field v-model="editingSchedule.cron" label="CRON Expression" hint="e.g. 0 0 8 * * MON-FRI" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showScheduleDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="saveSchedule">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVmApi } from './useVmApi.js'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  subscriptionId: { type: Number, required: true }
})

const { t } = useI18nStore()
const api = useVmApi()

const vmStatus = ref(null)
const executing = ref(null)
const activeTab = ref('schedules')
const schedules = ref([])
const snapshots = ref([])
const showScheduleDialog = ref(false)
const editingSchedule = ref({})
const creatingSnapshot = ref(false)

const operations = [
  { value: 'ON', label: 'Power On', icon: 'mdi-play', color: 'success' },
  { value: 'OFF', label: 'Power Off', icon: 'mdi-stop', color: 'error' },
  { value: 'SUSPEND', label: 'Suspend', icon: 'mdi-pause', color: 'warning' },
  { value: 'SHUTDOWN', label: 'Shutdown', icon: 'mdi-power', color: 'orange' },
  { value: 'RESET', label: 'Reset', icon: 'mdi-restart', color: 'purple' },
  { value: 'REBOOT', label: 'Reboot', icon: 'mdi-reload', color: 'blue' }
]

const operationItems = operations.map(op => ({ title: op.label, value: op.value }))

const scheduleHeaders = [
  { title: 'Operation', key: 'operation', sortable: true },
  { title: 'CRON', key: 'cron', sortable: false },
  { title: 'Next Execution', key: 'nextExecution', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

const snapshotHeaders = [
  { title: 'Date', key: 'date', sortable: true },
  { title: 'ID', key: 'id', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Volumes', key: 'volumes', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

const statusColor = computed(() => {
  const status = vmStatus.value?.status
  if (status === 'powered_on') return 'success'
  if (status === 'powered_off') return 'error'
  if (status === 'suspended') return 'warning'
  return 'grey'
})

const statusIcon = computed(() => {
  const status = vmStatus.value?.status
  if (status === 'powered_on') return 'mdi-play-circle'
  if (status === 'powered_off') return 'mdi-stop-circle'
  if (status === 'suspended') return 'mdi-pause-circle'
  return 'mdi-help-circle'
})

const statusText = computed(() => {
  const status = vmStatus.value?.status
  if (status === 'powered_on') return 'Running'
  if (status === 'powered_off') return 'Stopped'
  if (status === 'suspended') return 'Suspended'
  return 'Unknown'
})

function canExecute(operation) {
  const status = vmStatus.value?.status
  if (!status || executing.value) return false

  if (operation === 'ON') return status === 'powered_off' || status === 'suspended'
  if (operation === 'OFF' || operation === 'SUSPEND' || operation === 'SHUTDOWN') return status === 'powered_on'
  if (operation === 'RESET' || operation === 'REBOOT') return status === 'powered_on'

  return false
}

function getOpColor(operation) {
  return operations.find(op => op.value === operation)?.color || 'grey'
}

async function executeOp(operation) {
  if (!canExecute(operation)) return

  executing.value = operation
  try {
    await api.execute(props.subscriptionId, operation)
    await loadStatus()
  } catch (error) {
    console.error('Failed to execute operation:', error)
  } finally {
    executing.value = null
  }
}

async function loadStatus() {
  try {
    vmStatus.value = await api.getStatus(props.subscriptionId)
  } catch (error) {
    console.error('Failed to load VM status:', error)
  }
}

async function loadSchedules() {
  try {
    schedules.value = await api.getSchedules(props.subscriptionId)
  } catch (error) {
    console.error('Failed to load schedules:', error)
  }
}

async function loadSnapshots() {
  try {
    snapshots.value = await api.getSnapshots(props.subscriptionId)
  } catch (error) {
    console.error('Failed to load snapshots:', error)
  }
}

function openScheduleDialog(schedule = null) {
  editingSchedule.value = schedule ? { ...schedule } : { operation: 'ON', cron: '0 0 8 * * MON-FRI' }
  showScheduleDialog.value = true
}

async function saveSchedule() {
  try {
    const data = { ...editingSchedule.value, subscription: props.subscriptionId }
    if (editingSchedule.value.id) {
      await api.updateSchedule(data)
    } else {
      await api.saveSchedule(data)
    }
    showScheduleDialog.value = false
    await loadSchedules()
  } catch (error) {
    console.error('Failed to save schedule:', error)
  }
}

async function removeSchedule(schedule) {
  if (!confirm('Delete this schedule?')) return

  try {
    await api.deleteSchedule(schedule.id)
    await loadSchedules()
  } catch (error) {
    console.error('Failed to delete schedule:', error)
  }
}

async function createSnap() {
  creatingSnapshot.value = true
  try {
    await api.createSnapshot(props.subscriptionId)
    await loadSnapshots()
  } catch (error) {
    console.error('Failed to create snapshot:', error)
  } finally {
    creatingSnapshot.value = false
  }
}

async function removeSnapshot(snapshot) {
  if (!confirm('Delete this snapshot?')) return

  try {
    await api.deleteSnapshot(props.subscriptionId, snapshot.id)
    await loadSnapshots()
  } catch (error) {
    console.error('Failed to delete snapshot:', error)
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

function formatSize(volumes) {
  if (!volumes || !volumes.length) return '0 GB'
  const totalBytes = volumes.reduce((sum, v) => sum + (v.size || 0), 0)
  const gb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2)
  return `${gb} GB`
}

onMounted(() => {
  loadStatus()
  loadSchedules()
  loadSnapshots()
})
</script>
