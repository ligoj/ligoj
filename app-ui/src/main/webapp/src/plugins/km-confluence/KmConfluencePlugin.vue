<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useKmConfluenceApi } from './useKmConfluenceApi.js'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  subscriptionId: { type: [String, Number], default: null },
  nodeId: { type: [String, Number], default: null },
})

const route = useRoute()
const api = useKmConfluenceApi()
const i18nStore = useI18nStore()
const t = i18nStore.t

const spaces = ref([])
const activity = ref(null)
const needsAuth = ref(false)

const nodeIdValue = computed(() => props.nodeId || route.query.node || route.params.nodeId)

async function loadData() {
  if (!nodeIdValue.value) return

  const [spacesData, activityData] = await Promise.all([
    api.getSpaces(nodeIdValue.value),
    api.getActivity(nodeIdValue.value).catch(() => null),
  ])

  if (spacesData) {
    if (spacesData.authenticated === false) {
      needsAuth.value = true
    } else {
      spaces.value = Array.isArray(spacesData) ? spacesData : spacesData.spaces || []
    }
  }

  if (activityData) activity.value = activityData
}

onMounted(loadData)
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon color="blue" class="mr-2">mdi-book-open-variant</v-icon>
      {{ t('service.km.confluence') || 'Confluence' }}
    </v-card-title>

    <v-card-text>
      <v-alert v-if="needsAuth" type="warning" variant="tonal" class="mb-4">
        {{ t('service.km.confluence.auth.required') || 'Authentication required to view Confluence spaces' }}
      </v-alert>

      <v-list v-if="spaces.length > 0" lines="two">
        <v-list-item
          v-for="space in spaces"
          :key="space.key || space.id"
          :href="space.url"
          target="_blank"
        >
          <template #prepend>
            <v-icon>mdi-chevron-right</v-icon>
          </template>
          <v-list-item-title>{{ space.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ space.key }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <div v-if="!needsAuth && spaces.length === 0" class="text-grey">
        {{ t('service.km.confluence.no.spaces') || 'No spaces found' }}
      </div>

      <v-divider v-if="activity" class="my-4" />

      <div v-if="activity" class="d-flex align-center">
        <v-avatar v-if="activity.author?.avatar" size="32" class="mr-2">
          <img :src="activity.author.avatar" :alt="activity.author.name" />
        </v-avatar>
        <div class="flex-grow-1">
          <div class="text-subtitle-2">{{ activity.author?.name || 'Unknown' }}</div>
          <div class="text-caption text-grey">
            {{ activity.date ? new Date(activity.date).toLocaleString() : '' }}
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>
