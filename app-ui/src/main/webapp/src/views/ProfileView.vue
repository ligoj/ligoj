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
              <v-list-item to="/api/token" link>
                <template #prepend><v-icon>mdi-key-variant</v-icon></template>
                <v-list-item-title>{{ t('profile.apiTokens') }}</v-list-item-title>
                <v-list-item-subtitle>{{ t('profile.apiTokensHint') }}</v-list-item-subtitle>
                <template #append><v-icon size="small">mdi-chevron-right</v-icon></template>
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

            <!-- Skip unsaved-changes confirmation ---------------------- -->
            <div class="d-flex align-center mb-4">
              <v-icon class="mr-3">mdi-bell-off-outline</v-icon>
              <div class="flex-grow-1">
                <div class="text-subtitle-2">{{ t('profile.skipUnsavedConfirmation') }}</div>
                <div class="text-caption text-medium-emphasis">{{ t('profile.skipUnsavedConfirmationHint') }}</div>
              </div>
              <v-switch
                :model-value="skipUnsavedConfirmation"
                @update:model-value="onSkipUnsavedChange"
                color="success"
                hide-details
                density="compact"
                inset
              />
            </div>

            <v-divider class="mb-4" />

            <!-- Compact mode (global density toggle, orthogonal to the
                 preset). Lives next to the other binary preferences so
                 it composes naturally with whichever theme is picked. -->
            <div class="d-flex align-center mb-4">
              <v-icon class="mr-3">mdi-format-line-spacing</v-icon>
              <div class="flex-grow-1">
                <div class="text-subtitle-2">{{ t('profile.compact') }}</div>
                <div class="text-caption text-medium-emphasis">{{ t('profile.compactHint') }}</div>
              </div>
              <v-switch
                :model-value="compact"
                @update:model-value="onCompactChange"
                color="success"
                hide-details
                density="compact"
                inset
              />
            </div>

            <v-divider class="mb-4" />

            <!-- Theme preset -------------------------------------------
                 Single user-facing picker that bundles a Vuetify color
                 theme with a UI style (shape language). See
                 `plugins/presets.js#PRESET_OPTIONS` for the catalog.
                 Clicking a tile flips both at once: Vuetify's reactive
                 theme name AND the `<html data-style="…">` attribute
                 the CSS overrides hang off. -->
            <div class="d-flex align-center mb-3">
              <v-icon class="mr-3">mdi-palette</v-icon>
              <div class="text-subtitle-2 flex-grow-1">{{ t('profile.theme') }}</div>
            </div>

            <v-row density="comfortable">
              <v-col v-for="opt in PRESET_OPTIONS" :key="opt.id" cols="6" sm="4" md="3" lg="3">
                <v-card
                  class="preset-tile"
                  :class="{ 'preset-tile--active': preset === opt.id }"
                  variant="outlined"
                  :color="preset === opt.id ? 'primary' : undefined"
                  @click="choosePreset(opt.id)"
                >
                  <div class="preset-tile__swatches">
                    <span v-for="(c, i) in opt.swatch" :key="i" class="preset-tile__swatch" :style="{ background: c }" />
                  </div>
                  <div class="px-3 pb-2 pt-1">
                    <div class="d-flex align-center">
                      <v-icon size="x-small" class="mr-1">
                        {{ opt.dark ? 'mdi-weather-night' : 'mdi-weather-sunny' }}
                      </v-icon>
                      <span class="text-caption font-weight-medium">{{ opt.label }}</span>
                      <v-spacer />
                      <v-icon v-if="preset === opt.id" size="small" color="primary">mdi-check-circle</v-icon>
                    </div>
                    <!-- One-liner from the catalog. Shown muted so the
                         label still leads the eye. With 14 entries the
                         picker would otherwise read as a wall of names. -->
                    <div class="text-caption text-medium-emphasis preset-tile__desc">{{ opt.description }}</div>
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
import { computed, onMounted, ref } from 'vue'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'
import { PRESET_OPTIONS, detectPreset, applyPreset, persistPreset } from '@/plugins/presets.js'
import { detectCompact, applyCompact, persistCompact } from '@/plugins/styles.js'

const auth = useAuthStore()
const appStore = useAppStore()
const i18n = useI18nStore()
const theme = useTheme()
const t = i18n.t

/**
 * Local mirror of the persisted preset id — the tile picker uses it to
 * highlight the active selection reactively. `applyPreset` flips both
 * the Vuetify color theme AND the `<html data-style="…">` attribute,
 * so a single click switches the whole look-and-feel atomically.
 */
const preset = ref(detectPreset().id)
function choosePreset(id) {
  preset.value = id
  applyPreset(id, theme)
  persistPreset(id)
}

/**
 * Compact mode — orthogonal global density toggle (see
 * `plugins/styles.js#applyCompact`). Layers over any preset by writing
 * `<html data-compact="true">` and matching CSS at
 * `[data-compact="true"]` in `vuetify-overrides.css`.
 */
const compact = ref(detectCompact())
function onCompactChange(value) {
  compact.value = !!value
  applyCompact(compact.value)
  persistCompact(compact.value)
}

const LOCALE_LABELS = { en: 'English', fr: 'Français' }
const languageItems = computed(() =>
  i18n.SUPPORTED_LOCALES.map((value) => ({ value, title: LOCALE_LABELS[value] || value })),
)

const STORAGE_KEY = 'ligoj.skipUnsavedConfirmation'
const skipUnsavedConfirmation = ref(
  typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY) === 'true'
)
function onSkipUnsavedChange(value) {
  skipUnsavedConfirmation.value = !!value
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  }
}

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.profile') },
  ])
})
</script>

<style scoped>
.preset-tile {
  cursor: pointer;
  transition: transform 0.12s ease;
}
.preset-tile:hover {
  transform: translateY(-2px);
}
.preset-tile--active {
  border-width: 2px;
}
.preset-tile__swatches {
  display: flex;
  height: 36px;
}
.preset-tile__swatch {
  flex: 1 1 0;
}
.preset-tile__desc {
  line-height: 1.25;
  font-size: 0.72rem;
  margin-top: 2px;
  /* Two-line clamp so a long description doesn't push the grid out of
   * alignment — keeps the picker grid visually aligned even when one
   * description is longer than another. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
