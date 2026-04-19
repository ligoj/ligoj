<template>
  <v-dialog :model-value="modelValue" max-width="500" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>{{ t('agreement.title') }}</v-card-title>
      <v-card-text>
        <p class="mb-4">{{ t('agreement.text') }}</p>
        <v-checkbox v-model="agreed" :label="t('agreement.checkbox')" hide-details />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="elevated" :disabled="!agreed" :loading="loading" @click="accept">
          {{ t('agreement.accept') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'agreed'])

const i18n = useI18nStore()
const t = i18n.t
const agreed = ref(false)

function accept() {
  emit('agreed')
}
</script>
