<template>
  <div class="error-snackbar-stack">
    <v-snackbar
      v-for="entry in errorStore.errors"
      :key="entry.id"
      :model-value="true"
      :color="entry.severity || 'error'"
      location="bottom right"
      timeout="-1"
      multi-line
    >
      <div class="d-flex flex-column">
        <!-- Optional title row: backend `code` resolved through i18n,
             or one of the catalogue keys (`error.400`, `error.404`, …). -->
        <div v-if="entry.title" class="font-weight-medium mb-1">
          <span v-if="entry.status" class="opacity-80 mr-1">{{ entry.status }}</span>
          {{ entry.title }}
        </div>
        <div v-else-if="entry.status" class="font-weight-bold mr-1">{{ entry.status }}</div>

        <!-- Primary message. Whitespace preserved so the legacy
             `\n` separators in interpolated strings still read. -->
        <div class="text-pre-line">{{ entry.message }}</div>

        <!-- Optional cause chain — legacy's "[…]" technical detail
             toggle. Hidden until the user clicks "Details". The store
             walks `cause.cause.cause…` into a `›`-separated string. -->
        <template v-if="entry.details">
          <a class="text-caption text-decoration-underline mt-1 cursor-pointer" @click.stop="toggle(entry.id)">
            {{ openDetails.has(entry.id) ? t('common.close') : '[...]' }}
          </a>
          <div v-if="openDetails.has(entry.id)" class="text-caption text-pre-line opacity-90 mt-1">
            › {{ entry.details }}
          </div>
        </template>
      </div>

      <template #actions>
        <v-btn variant="text" icon="mdi-close" size="small" @click="errorStore.dismiss(entry.id)" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useErrorStore } from '@/stores/error.js'
import { useI18nStore } from '@/stores/i18n.js'

const errorStore = useErrorStore()
const { t } = useI18nStore()

// Toggle state lives in the component (not the store) — it's pure UI,
// and a closed toast shouldn't leave residue in the store.
const openDetails = reactive(new Set())
function toggle(id) {
  if (openDetails.has(id)) openDetails.delete(id)
  else openDetails.add(id)
}
</script>

<style scoped>
.text-pre-line {
  white-space: pre-line;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
