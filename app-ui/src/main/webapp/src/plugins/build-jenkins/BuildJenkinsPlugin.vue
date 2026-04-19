<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon color="red" class="mr-2">mdi-hammer-wrench</v-icon>
      Jenkins
    </v-card-title>
    <v-card-text>
      <div v-if="jobData">
        <div class="d-flex align-center mb-4">
          <v-btn :href="jobUrl" target="_blank" variant="text" prepend-icon="mdi-open-in-new">
            {{ jobName }}
          </v-btn>
          <v-spacer />
          <v-btn color="success" :loading="building" @click="triggerBuild" prepend-icon="mdi-play">
            Build
          </v-btn>
        </div>

        <v-chip :color="statusColor" variant="tonal" class="mb-4">
          <v-icon start>{{ statusIcon }}</v-icon>
          {{ statusText }}
        </v-chip>

        <v-list v-if="branches.length" density="compact">
          <v-list-subheader>Branches</v-list-subheader>
          <v-list-item v-for="branch in branches" :key="branch.name">
            <template #prepend>
              <v-icon :color="getBranchStatusColor(branch)" size="small">
                {{ branch.pullRequest ? 'mdi-source-pull' : 'mdi-source-branch' }}
              </v-icon>
            </template>
            <v-list-item-title>{{ branch.name }}</v-list-item-title>
            <template #append>
              <v-chip :color="getBranchStatusColor(branch)" size="x-small" variant="tonal" class="mr-2">
                {{ getBranchStatusText(branch) }}
              </v-chip>
              <v-btn icon size="x-small" @click="triggerBranchBuild(branch)" :loading="branch.building">
                <v-icon size="small">mdi-play</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </div>
      <div v-else class="text-center pa-4">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </v-card-text>
    <v-snackbar v-model="buildSuccess" :timeout="3000" color="success">Build triggered</v-snackbar>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useJenkinsApi } from './useJenkinsApi.js'

const props = defineProps({
  subscriptionId: { type: Number, required: true },
  node: { type: Object, required: true },
})

const api = useJenkinsApi()
const jobData = ref(null)
const building = ref(false)
const buildSuccess = ref(false)
const branches = ref([])

const jobName = computed(() => jobData.value?.name || '')
const jobUrl = computed(() => props.node?.parameters?.url || '')

const statusColor = computed(() => {
  const status = jobData.value?.status || ''
  if (status.includes('blue')) return 'success'
  if (status.includes('red')) return 'error'
  if (status.includes('yellow')) return 'warning'
  if (status.includes('disabled')) return 'grey'
  return 'grey'
})

const statusIcon = computed(() => {
  const status = jobData.value?.status || ''
  if (status.includes('blue')) return 'mdi-check-circle'
  if (status.includes('red')) return 'mdi-close-circle'
  if (status.includes('yellow')) return 'mdi-alert-circle'
  return 'mdi-help-circle'
})

const statusText = computed(() => {
  const status = jobData.value?.status || ''
  if (status.includes('blue')) return 'Success'
  if (status.includes('red')) return 'Failure'
  if (status.includes('yellow')) return 'Unstable'
  if (status.includes('disabled')) return 'Disabled'
  return 'Unknown'
})

const getBranchStatusColor = (branch) => {
  const status = branch.status || ''
  if (status.includes('blue')) return 'success'
  if (status.includes('red')) return 'error'
  if (status.includes('yellow')) return 'warning'
  return 'grey'
}

const getBranchStatusText = (branch) => {
  const status = branch.status || ''
  if (status.includes('blue')) return 'OK'
  if (status.includes('red')) return 'Failed'
  if (status.includes('yellow')) return 'Unstable'
  return 'N/A'
}

const loadJob = async () => {
  try {
    jobData.value = await api.getJob(props.subscriptionId)
    await loadBranches()
  } catch (error) {
    console.error('Failed to load job:', error)
  }
}

const loadBranches = async () => {
  try {
    const data = await api.getBranches(props.subscriptionId)
    branches.value = (data || []).map(b => ({ ...b, building: false }))
  } catch (error) {
    console.error('Failed to load branches:', error)
    branches.value = []
  }
}

const triggerBuild = async () => {
  building.value = true
  try {
    await api.build(props.subscriptionId)
    buildSuccess.value = true
    setTimeout(loadJob, 2000)
  } catch (error) {
    console.error('Failed to trigger build:', error)
  } finally {
    building.value = false
  }
}

const triggerBranchBuild = async (branch) => {
  branch.building = true
  try {
    await api.build(props.subscriptionId)
    buildSuccess.value = true
    setTimeout(loadBranches, 2000)
  } catch (error) {
    console.error('Failed to trigger branch build:', error)
  } finally {
    branch.building = false
  }
}

onMounted(() => {
  loadJob()
})
</script>
