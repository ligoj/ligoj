<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2" color="purple">mdi-terraform</v-icon>
      Terraform
    </v-card-title>
    <v-card-text>
      <v-alert v-if="!installed" type="warning" variant="tonal" class="mb-4">
        {{ t('service.prov.terraform.notInstalled') }}
        <template #append>
          <v-btn color="warning" variant="flat" size="small" :loading="installing" @click="install">
            {{ t('common.install') || 'Install' }}
          </v-btn>
        </template>
      </v-alert>

      <div v-else class="d-flex ga-2 mb-4">
        <v-btn v-for="action in actions" :key="action" :color="actionColor(action)" variant="tonal" size="small" :loading="running === action" @click="execute(action)">
          <v-icon class="mr-1" size="small">{{ actionIcon(action) }}</v-icon>
          {{ action }}
        </v-btn>
      </div>

      <div v-if="steps.length" class="mb-4">
        <v-chip v-for="(step, i) in steps" :key="i" :color="stepColor(step)" size="small" class="mr-1 mb-1">
          <v-icon v-if="step.status === 'running'" size="x-small" class="mr-1">mdi-loading mdi-spin</v-icon>
          <v-icon v-else-if="step.status === 'done'" size="x-small" class="mr-1">mdi-check</v-icon>
          <v-icon v-else-if="step.status === 'failed'" size="x-small" class="mr-1">mdi-close</v-icon>
          {{ step.name }}
        </v-chip>
      </div>

      <v-expand-transition>
        <v-textarea v-if="log" :model-value="log" readonly auto-grow variant="outlined" density="compact" class="font-mono text-caption" rows="10" />
      </v-expand-transition>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProvApi } from '../useProvApi.js'
import { useI18nStore } from '@/stores/i18n'

const { t } = useI18nStore()
const { getTerraformStatus, installTerraform, executeTerraform, getTerraformLog } = useProvApi()

const installed = ref(false)
const installing = ref(false)
const running = ref(null)
const steps = ref([])
const log = ref('')

const actions = ['generate', 'plan', 'apply', 'destroy']

const actionColor = (action) => {
  const colors = { generate: 'primary', plan: 'info', apply: 'success', destroy: 'error' }
  return colors[action] || 'default'
}

const actionIcon = (action) => {
  const icons = { generate: 'mdi-file-code', plan: 'mdi-clipboard-list', apply: 'mdi-rocket-launch', destroy: 'mdi-delete-forever' }
  return icons[action] || 'mdi-cog'
}

const stepColor = (step) => {
  if (step.status === 'running') return 'info'
  if (step.status === 'done') return 'success'
  if (step.status === 'failed') return 'error'
  return 'default'
}

const install = async () => {
  installing.value = true
  try {
    await installTerraform()
    installed.value = true
  } finally {
    installing.value = false
  }
}

const execute = async (action) => {
  running.value = action
  steps.value = [
    { name: 'generate', status: 'pending' },
    { name: 'clean', status: 'pending' },
    { name: 'secrets', status: 'pending' },
    { name: 'show', status: 'pending' },
    { name: 'state', status: 'pending' },
    { name: 'init', status: 'pending' },
    { name: 'plan', status: 'pending' },
    { name: action, status: 'pending' }
  ]
  log.value = ''

  try {
    await executeTerraform(action)
    await pollProgress()
  } finally {
    running.value = null
  }
}

const pollProgress = async () => {
  const interval = setInterval(async () => {
    const status = await getTerraformStatus()
    if (status.steps) {
      steps.value = status.steps
    }
    if (status.log) {
      log.value = status.log
    }
    if (status.completed) {
      clearInterval(interval)
      log.value = await getTerraformLog()
    }
  }, 1000)
}

const loadStatus = async () => {
  const status = await getTerraformStatus()
  installed.value = status.installed
}

onMounted(loadStatus)
</script>
