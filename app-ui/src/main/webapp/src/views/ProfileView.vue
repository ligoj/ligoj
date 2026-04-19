<template>
  <div>
    <h1 class="text-h4 mb-6">{{ t('profile.title') }}</h1>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-account</v-icon>
            {{ t('profile.account') }}
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <template #prepend><v-icon>mdi-account-circle</v-icon></template>
                <v-list-item-title>{{ t('profile.username') }}</v-list-item-title>
                <v-list-item-subtitle>{{ auth.userName }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend><v-icon>mdi-shield-account</v-icon></template>
                <v-list-item-title>{{ t('profile.roles') }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip v-for="role in auth.roles" :key="role" size="small" class="mr-1">{{ role }}</v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-key</v-icon>
            {{ t('profile.permissions') }}
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-subheader>{{ t('profile.uiAuth', { count: auth.uiAuthorizations.length }) }}</v-list-subheader>
              <v-list-item v-for="(pattern, i) in auth.uiAuthorizations" :key="'ui-'+i">
                <v-list-item-title class="text-caption font-weight-medium">{{ pattern }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'

const auth = useAuthStore()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

onMounted(() => {
  appStore.setTitle(t('profile.title'))
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.profile') },
  ])
})
</script>
