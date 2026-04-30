<template>
  <div class="error-snackbar-stack">
    <v-snackbar
      v-for="entry in errorStore.errors"
      :key="entry.id"
      :model-value="true"
      :color="entry.severity || 'error'"
      location="bottom right"
      timeout="-1"
    >
      <span v-if="entry.status" class="font-weight-bold mr-1">{{ entry.status }}</span>
      {{ entry.message }}
      <template #actions>
        <v-btn variant="text" icon="mdi-close" size="small" @click="errorStore.dismiss(entry.id)" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { useErrorStore } from '@/stores/error.js'

const errorStore = useErrorStore()
</script>
