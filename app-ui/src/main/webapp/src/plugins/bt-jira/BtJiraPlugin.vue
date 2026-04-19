<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon color="blue" class="mr-2">mdi-bug</v-icon>
      JIRA
      <v-spacer />
      <v-btn color="primary" variant="outlined" @click="showImportDialog = true" prepend-icon="mdi-upload">
        Import CSV
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-text-field v-model="projectUrl" label="JIRA Project" readonly
        append-inner-icon="mdi-open-in-new" @click:append-inner="openJira" />

      <h3 class="text-subtitle-1 font-weight-medium mt-4 mb-2">Issues by Priority</h3>
      <div v-for="stat in issueStats" :key="stat.priority" class="d-flex align-center mb-2">
        <v-chip :color="stat.color" size="small" class="mr-3" style="min-width: 80px">
          {{ stat.priority }}
        </v-chip>
        <v-progress-linear :model-value="stat.percent" :color="stat.color" height="20" rounded class="flex-grow-1">
          <template #default>{{ stat.count }}</template>
        </v-progress-linear>
      </div>
    </v-card-text>
  </v-card>

  <v-dialog v-model="showImportDialog" max-width="600">
    <v-card>
      <v-card-title>Import CSV</v-card-title>
      <v-card-text>
        <v-file-input v-model="csvFile" label="CSV File" accept=".csv" prepend-icon="mdi-file-delimited" />
        <v-select v-model="encoding" :items="['UTF-8', 'ISO-8859-1', 'Windows-1252']" label="Encoding" />
        <v-select v-model="importMode" :items="importModes" label="Import Mode" />

        <div v-if="importing" class="mt-4">
          <v-progress-linear :model-value="importProgress" color="primary" height="6" rounded />
          <div class="text-caption mt-1">Step {{ currentStep }} / {{ totalSteps }}: {{ currentStepLabel }}</div>
        </div>

        <v-alert v-if="importResult" :type="importResult.success ? 'success' : 'error'" class="mt-4">
          {{ importResult.message }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showImportDialog = false" :disabled="importing">Cancel</v-btn>
        <v-btn color="primary" @click="startImport" :loading="importing" :disabled="!csvFile">Import</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBtJiraApi } from './useBtJiraApi.js'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  subscriptionId: { type: Number, required: true }
})

const { t } = useI18nStore()
const api = useBtJiraApi()

const projectData = ref(null)
const projectUrl = ref('')
const showImportDialog = ref(false)
const csvFile = ref(null)
const encoding = ref('UTF-8')
const importMode = ref('SYNTAX')
const importing = ref(false)
const importProgress = ref(0)
const currentStep = ref(0)
const totalSteps = ref(4)
const currentStepLabel = ref('')
const importResult = ref(null)

const importModes = [
  { title: 'Syntax check', value: 'SYNTAX' },
  { title: 'Validation', value: 'VALIDATION' },
  { title: 'Preview', value: 'PREVIEW' },
  { title: 'Full import', value: 'FULL' }
]

const priorityColors = {
  BLOCKER: 'red',
  CRITICAL: 'deep-orange',
  MAJOR: 'orange',
  MINOR: 'blue',
  TRIVIAL: 'grey'
}

const issueStats = computed(() => {
  if (!projectData.value?.statistics) return []

  const stats = projectData.value.statistics
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0)

  return Object.entries(stats).map(([priority, count]) => ({
    priority,
    count,
    percent: total > 0 ? (count / total) * 100 : 0,
    color: priorityColors[priority] || 'grey'
  }))
})

async function loadProject() {
  try {
    const data = await api.getProject(props.subscriptionId)
    projectData.value = data
    projectUrl.value = data.jiraUrl || ''
  } catch (error) {
    console.error('Failed to load JIRA project:', error)
  }
}

function openJira() {
  if (projectUrl.value) {
    window.open(projectUrl.value, '_blank')
  }
}

async function startImport() {
  if (!csvFile.value || !csvFile.value.length) return

  importing.value = true
  importProgress.value = 0
  currentStep.value = 0
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', csvFile.value[0])
    formData.append('encoding', encoding.value)

    currentStep.value = 1
    currentStepLabel.value = 'Uploading file'
    importProgress.value = 25

    await api.importCsv(props.subscriptionId, formData, importMode.value)

    currentStep.value = 2
    currentStepLabel.value = 'Processing'
    importProgress.value = 50

    await pollImportTask()

  } catch (error) {
    importResult.value = {
      success: false,
      message: error.message || 'Import failed'
    }
  } finally {
    importing.value = false
  }
}

async function pollImportTask() {
  let attempts = 0
  const maxAttempts = 30

  while (attempts < maxAttempts) {
    try {
      const task = await api.getTask(props.subscriptionId)

      if (task.finished) {
        currentStep.value = totalSteps.value
        importProgress.value = 100
        currentStepLabel.value = 'Complete'

        importResult.value = {
          success: !task.failed,
          message: task.failed ? task.error : `Import completed: ${task.processed} issues processed`
        }

        if (!task.failed) {
          await loadProject()
        }
        break
      }

      currentStep.value = 3
      currentStepLabel.value = `Processing: ${task.processed || 0} issues`
      importProgress.value = 50 + (task.progress || 0) * 0.5

      await new Promise(resolve => setTimeout(resolve, 2000))
      attempts++

    } catch (error) {
      throw new Error('Failed to check import status')
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error('Import timeout')
  }
}

onMounted(() => {
  loadProject()
})
</script>
