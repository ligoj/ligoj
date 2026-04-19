<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon color="deep-purple" class="mr-2">mdi-bug</v-icon>
      SLA Configuration
      <v-spacer />
      <v-btn color="primary" @click="openSlaDialog()" prepend-icon="mdi-plus">New SLA</v-btn>
    </v-card-title>
    <v-card-text>
      <v-data-table :items="slas" :headers="headers" density="compact">
        <template #item.threshold="{ item }">{{ formatThreshold(item.threshold) }}</template>
        <template #item.start="{ item }">
          <v-chip v-for="s in parseStatuses(item.start)" :key="s" size="x-small" class="mr-1">{{ s }}</v-chip>
        </template>
        <template #item.stop="{ item }">
          <v-chip v-for="s in parseStatuses(item.stop)" :key="s" size="x-small" class="mr-1">{{ s }}</v-chip>
        </template>
        <template #item.pause="{ item }">
          <v-chip v-for="s in parseStatuses(item.pause)" :key="s" size="x-small" class="mr-1" color="warning">{{ s }}</v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon size="small" @click="openSlaDialog(item)"><v-icon>mdi-pencil</v-icon></v-btn>
          <v-btn icon size="small" color="error" @click="confirmDelete(item)"><v-icon>mdi-delete</v-icon></v-btn>
        </template>
      </v-data-table>

      <h3 class="text-h6 mt-6 mb-2">Business Hours</h3>
      <v-sheet v-for="day in businessDays" :key="day.name" class="d-flex align-center mb-1">
        <span class="text-body-2" style="width: 100px">{{ day.name }}</span>
        <v-progress-linear :model-value="day.percent" color="primary" height="20" rounded>
          <template #default><span class="text-caption">{{ day.startTime }} - {{ day.endTime }}</span></template>
        </v-progress-linear>
      </v-sheet>
    </v-card-text>
  </v-card>

  <v-dialog v-model="showDialog" max-width="600">
    <v-card>
      <v-card-title>{{ editingSla.id ? 'Edit' : 'New' }} SLA</v-card-title>
      <v-card-text>
        <v-text-field v-model="editingSla.name" label="Name" />
        <v-text-field v-model="editingSla.start" label="Start Statuses" hint="Comma-separated" />
        <v-text-field v-model="editingSla.stop" label="Stop Statuses" hint="Comma-separated" />
        <v-text-field v-model="editingSla.pause" label="Pause Statuses" hint="Comma-separated" />
        <div class="d-flex ga-2">
          <v-text-field v-model.number="thresholdHours" label="Hours" type="number" style="max-width: 100px" />
          <v-text-field v-model.number="thresholdMinutes" label="Minutes" type="number" style="max-width: 100px" />
          <v-text-field v-model.number="thresholdSeconds" label="Seconds" type="number" style="max-width: 100px" />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="saveSla">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDeleteDialog" max-width="400">
    <v-card>
      <v-card-title>Delete SLA</v-card-title>
      <v-card-text>Delete "{{ deletingSla?.name }}"?</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showDeleteDialog = false">Cancel</v-btn>
        <v-btn color="error" @click="deleteSla">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBtApi } from './useBtApi.js'

const props = defineProps({
  subscriptionId: { type: Number, required: true },
})

const api = useBtApi()
const slas = ref([])
const businessHours = ref(null)
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingSla = ref({})
const deletingSla = ref(null)
const thresholdHours = ref(0)
const thresholdMinutes = ref(0)
const thresholdSeconds = ref(0)

const headers = [
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Start', value: 'start', sortable: false },
  { title: 'Stop', value: 'stop', sortable: false },
  { title: 'Pause', value: 'pause', sortable: false },
  { title: 'Threshold', value: 'threshold', sortable: true },
  { title: 'Actions', value: 'actions', sortable: false, align: 'end' },
]

const businessDays = computed(() => {
  if (!businessHours.value) {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(name => ({
      name,
      startTime: '09:00',
      endTime: '18:00',
      percent: 37.5,
    }))
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days.map(name => {
    const dayData = businessHours.value[name.toLowerCase()] || { start: 9 * 60, end: 18 * 60 }
    const startMinutes = dayData.start || 0
    const endMinutes = dayData.end || 0
    const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
    const percent = ((endMinutes - startMinutes) / (24 * 60)) * 100

    return { name, startTime, endTime, percent }
  })
})

const parseStatuses = (statusString) => {
  if (!statusString) return []
  if (Array.isArray(statusString)) return statusString
  return statusString.split(',').map(s => s.trim()).filter(Boolean)
}

const formatThreshold = (milliseconds) => {
  if (!milliseconds) return '00:00:00'
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const loadSlas = async () => {
  try {
    slas.value = await api.getSlas(props.subscriptionId)
  } catch (error) {
    console.error('Failed to load SLAs:', error)
    slas.value = []
  }
}

const loadBusinessHours = async () => {
  try {
    businessHours.value = await api.getBusinessHours(props.subscriptionId)
  } catch (error) {
    console.error('Failed to load business hours:', error)
  }
}

const openSlaDialog = (sla = null) => {
  if (sla) {
    editingSla.value = { ...sla }
    const totalSeconds = Math.floor((sla.threshold || 0) / 1000)
    thresholdHours.value = Math.floor(totalSeconds / 3600)
    thresholdMinutes.value = Math.floor((totalSeconds % 3600) / 60)
    thresholdSeconds.value = totalSeconds % 60
  } else {
    editingSla.value = { subscription: props.subscriptionId, name: '', start: '', stop: '', pause: '' }
    thresholdHours.value = 0
    thresholdMinutes.value = 0
    thresholdSeconds.value = 0
  }
  showDialog.value = true
}

const saveSla = async () => {
  const threshold = (thresholdHours.value * 3600 + thresholdMinutes.value * 60 + thresholdSeconds.value) * 1000
  const data = {
    ...editingSla.value,
    threshold,
  }

  try {
    if (data.id) {
      await api.updateSla(data)
    } else {
      await api.createSla(data)
    }
    showDialog.value = false
    await loadSlas()
  } catch (error) {
    console.error('Failed to save SLA:', error)
  }
}

const confirmDelete = (sla) => {
  deletingSla.value = sla
  showDeleteDialog.value = true
}

const deleteSla = async () => {
  try {
    await api.deleteSla(deletingSla.value.id)
    showDeleteDialog.value = false
    deletingSla.value = null
    await loadSlas()
  } catch (error) {
    console.error('Failed to delete SLA:', error)
  }
}

onMounted(() => {
  loadSlas()
  loadBusinessHours()
})
</script>
