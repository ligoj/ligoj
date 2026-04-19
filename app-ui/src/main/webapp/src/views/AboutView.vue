<template>
  <div>
    <h1 class="text-h4 mb-6">{{ t('about.title') }}</h1>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-information</v-icon>
            {{ t('about.app') }}
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <tbody>
                <tr>
                  <td class="font-weight-medium">{{ t('about.version') }}</td>
                  <td>{{ auth.appSettings.buildVersion || '-' }}</td>
                </tr>
                <tr>
                  <td class="font-weight-medium">{{ t('about.buildDate') }}</td>
                  <td>{{ buildDate }}</td>
                </tr>
                <tr>
                  <td class="font-weight-medium">{{ t('about.buildNumber') }}</td>
                  <td>{{ auth.appSettings.buildNumber || '-' }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-puzzle</v-icon>
            {{ t('about.features') }}
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="plugin in features" :key="plugin">
                <template #prepend><v-icon size="small">mdi-check-circle</v-icon></template>
                <v-list-item-title>{{ plugin }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="!features.length">
                <v-list-item-title class="text-medium-emphasis">{{ t('about.noFeatures') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-monitor-dashboard</v-icon>
            {{ t('about.frontend') }}
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <tbody>
                <tr>
                  <td class="font-weight-medium">{{ t('about.framework') }}</td>
                  <td>Vue 3 + Vuetify 3</td>
                </tr>
                <tr>
                  <td class="font-weight-medium">{{ t('about.buildTool') }}</td>
                  <td>Vite 6</td>
                </tr>
                <tr>
                  <td class="font-weight-medium">{{ t('about.state') }}</td>
                  <td>Pinia 2</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
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

const features = computed(() => auth.appSettings.plugins || [])

const buildDate = computed(() => {
  const ts = auth.appSettings.buildTimestamp
  if (!ts) return '-'
  return new Date(Number(ts)).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
})

onMounted(() => {
  appStore.setTitle(t('about.title'))
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.about') },
  ])
})
</script>
