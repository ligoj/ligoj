<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi.js'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  subscriptionId: { type: [String, Number], default: null },
})

const route = useRoute()
const { get } = useApi()
const i18nStore = useI18nStore()
const t = i18nStore.t

const subscription = ref(null)
const copied = ref(false)

const subId = computed(() => props.subscriptionId || route.query.subscription || route.params.id)
const repoUrl = computed(() => subscription.value?.parameters?.['service:scm:git:repository'] || '')
const repository = computed(() => subscription.value?.parameters?.['service:scm:git:repository']?.split('/').pop() || '')

async function loadData() {
  if (!subId.value) return
  const data = await get(`rest/subscription/${subId.value}`)
  if (data) subscription.value = data
}

async function copyUrl() {
  if (!repoUrl.value) return
  try {
    await navigator.clipboard.writeText(repoUrl.value)
    copied.value = true
  } catch (err) {
    console.error('Failed to copy URL:', err)
  }
}

onMounted(loadData)
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon color="orange-darken-2" class="mr-2">mdi-git</v-icon>
      {{ t('service.scm.git') || 'Git' }}
    </v-card-title>
    <v-card-text>
      <v-text-field
        v-model="repoUrl"
        :label="t('service.scm.git.url') || 'Repository URL'"
        readonly
        append-inner-icon="mdi-content-copy"
        @click:append-inner="copyUrl"
      />
      <v-text-field
        v-model="repository"
        :label="t('service.scm.git.repository') || 'Repository'"
        readonly
      />
      <v-btn
        v-if="repoUrl"
        :href="repoUrl"
        target="_blank"
        color="primary"
        variant="text"
        prepend-icon="mdi-open-in-new"
      >
        {{ t('common.open') || 'Open Repository' }}
      </v-btn>
    </v-card-text>
    <v-snackbar v-model="copied" :timeout="2000" color="success">
      URL copied!
    </v-snackbar>
  </v-card>
</template>
