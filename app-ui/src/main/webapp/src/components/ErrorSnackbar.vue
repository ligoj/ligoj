<template>
  <div class="error-snackbar-stack">
    <v-snackbar
      v-for="error in errorStore.errors"
      :key="error.id"
      :model-value="true"
      color="error"
      location="bottom right"
      timeout="-1"
    >
      <span v-if="error.status" class="font-weight-bold mr-1">{{ error.status }}</span>
      {{ error.message }}
      <template #actions>
        <v-btn variant="text" icon="mdi-close" size="small" @click="errorStore.dismiss(error.id)" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { useErrorStore } from '@/stores/error.js'

const errorStore = useErrorStore()
</script>
