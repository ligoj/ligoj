<!--
  App-bar warning chips of the session: one per backend `{code, parameters}`
  entry of `userSettings.warnings` (filled by the `ISessionSettingsProvider`
  plug-ins, e.g. plugin-iam-node without primary node). The chip shows the
  `warning.<code>.label` short label, the tooltip the `warning.<code>`
  explanation; a click emits `select` with the warning.
-->
<template>
  <v-chip v-for="(warning, i) in list" :key="warning.code + '-' + i" class="session-warning" size="small" color="warning"
    variant="flat" prepend-icon="mdi-alert" @click="$emit('select', warning)">
    {{ codedWarningLabel(warning, i18n) }}
    <v-tooltip activator="parent" location="bottom" max-width="380">{{ codedWarningMessage(warning, i18n) }}</v-tooltip>
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18n.js'
import { codedWarningLabel, codedWarningMessage } from '@/utils/codedWarning.js'

const props = defineProps({
  /** The session warnings, `{code, parameters}` each. */
  warnings: { type: Array, default: () => [] },
})
defineEmits(['select'])

const i18n = useI18nStore()
const list = computed(() => (props.warnings || []).filter((w) => w && w.code))
</script>

<style scoped>
.session-warning {
  flex-shrink: 0;
  cursor: pointer;
  margin-right: 2px;
}
</style>
