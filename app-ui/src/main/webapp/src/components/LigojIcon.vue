<template>
  <v-icon v-if="icon" :size="size">{{ icon }}</v-icon>
</template>

<script setup>
/**
 * LigojIcon — thin wrapper around <v-icon>.
 *
 * Reserved as a hook for upcoming compact-mode logic (sidebar collapsed):
 * the wrapper lets every caller stay unchanged while the rendering policy
 * evolves in a single place. For now, behaves exactly like <v-icon>.
 */
defineProps({
  icon: { type: String, required: true },
  size: { type: [String, Number], default: undefined },
})
</script>
