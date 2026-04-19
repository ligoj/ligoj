<template>
  <div>
    <h1 class="text-h4 mb-2">{{ t('nav.dashboard') }}</h1>
    <p class="text-subtitle-1 text-medium-emphasis mb-6">{{ t('dashboard.welcome', { name: auth.userName }) }}</p>
    <v-row>
      <v-col
        v-for="card in cards"
        :key="card.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card :to="card.route" hover elevation="2" rounded="lg">
          <v-card-item>
            <template #prepend>
              <v-avatar :color="card.color" size="48">
                <v-icon color="white">{{ card.icon }}</v-icon>
              </v-avatar>
            </template>
            <v-card-title>{{ card.labelKey ? t(card.labelKey) : card.label }}</v-card-title>
            <v-card-subtitle v-if="card.subtitle">{{ card.subtitle }}</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>
    <v-alert v-if="!cards.length" type="info" variant="tonal" class="mt-4">
      {{ t('dashboard.noModules') }}
    </v-alert>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'

const auth = useAuthStore()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const CARD_META = computed(() => ({
  'id-user': { color: 'blue', subtitle: t('dashboard.manageUsers') },
  'id-group': { color: 'teal', subtitle: t('dashboard.manageGroups') },
  'id-company': { color: 'indigo', subtitle: t('dashboard.manageCompanies') },
  'id-delegate': { color: 'purple', subtitle: t('dashboard.manageDelegates') },
  'id-container-scope': { color: 'cyan', subtitle: t('dashboard.manageContainerScopes') },
  'project': { color: 'orange', subtitle: t('dashboard.manageProjects') },
  'admin': { color: 'red', subtitle: t('dashboard.manageAdmin') },
}))

/** Flatten nav items into dashboard cards */
const cards = computed(() => {
  const result = []
  const meta = CARD_META.value
  for (const item of auth.navItems) {
    if (item.id === 'home') continue // skip home itself
    if (item.children) {
      for (const child of item.children) {
        result.push({ ...child, ...(meta[child.id] || {}) })
      }
    } else {
      result.push({ ...item, ...(meta[item.id] || {}) })
    }
  }
  return result
})

onMounted(() => {
  appStore.setTitle(t('nav.dashboard'))
  appStore.setBreadcrumbs([{ title: t('nav.home'), to: '/' }])
})
</script>
