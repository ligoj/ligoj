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
              <v-list-item v-for="(pattern, i) in auth.uiAuthorizations" :key="'ui-' + i">
                <v-list-item-title class="text-caption font-weight-medium">{{ pattern }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-tune</v-icon>
            {{ t('profile.preferences') }}
          </v-card-title>
          <v-card-text>
            <!-- Language ----------------------------------------------- -->
            <div class="d-flex align-center mb-4">
              <v-icon class="mr-3">mdi-translate</v-icon>
              <div class="flex-grow-1">
                <div class="text-subtitle-2">{{ t('profile.language') }}</div>
              </div>
              <v-select
                :model-value="i18n.locale"
                :items="languageItems"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 220px"
                @update:model-value="i18n.setLocale($event)"
              />
            </div>

            <v-divider class="mb-4" />

            <!-- Theme -------------------------------------------------- -->
            <div class="d-flex align-center mb-3">
              <v-icon class="mr-3">mdi-palette</v-icon>
              <div class="text-subtitle-2 flex-grow-1">{{ t('profile.theme') }}</div>
            </div>

            <v-row dense>
              <v-col v-for="opt in THEME_OPTIONS" :key="opt.id" cols="6" sm="4" md="3" lg="2">
                <v-card
                  class="theme-tile"
                  :class="{ 'theme-tile--active': theme.global.name.value === opt.id }"
                  variant="outlined"
                  :color="theme.global.name.value === opt.id ? 'primary' : undefined"
                  @click="chooseTheme(opt.id)"
                >
                  <div class="theme-tile__swatches">
                    <span v-for="(c, i) in opt.swatch" :key="i" class="theme-tile__swatch" :style="{ background: c }" />
                  </div>
                  <div class="d-flex align-center px-2 py-1">
                    <v-icon size="x-small" class="mr-1">
                      {{ opt.dark ? 'mdi-weather-night' : 'mdi-weather-sunny' }}
                    </v-icon>
                    <span class="text-caption">{{ opt.label }}</span>
                    <v-spacer />
                    <v-icon v-if="theme.global.name.value === opt.id" size="small" color="primary">mdi-check-circle</v-icon>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'
import { THEME_OPTIONS, persistTheme } from '@/plugins/vuetify.js'

const auth = useAuthStore()
const appStore = useAppStore()
const i18n = useI18nStore()
const theme = useTheme()
const t = i18n.t

const LOCALE_LABELS = { en: 'English', fr: 'Français' }
const languageItems = computed(() =>
  i18n.SUPPORTED_LOCALES.map((value) => ({ value, title: LOCALE_LABELS[value] || value })),
)

function chooseTheme(id) {
  theme.global.name.value = id
  persistTheme(id)
}

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.profile') },
  ])
})
</script>

<style scoped>
.theme-tile {
  cursor: pointer;
  transition: transform 0.12s ease;
}
.theme-tile:hover {
  transform: translateY(-2px);
}
.theme-tile--active {
  border-width: 2px;
}
.theme-tile__swatches {
  display: flex;
  height: 36px;
}
.theme-tile__swatch {
  flex: 1 1 0;
}
</style>
