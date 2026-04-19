<template>
  <div class="d-flex flex-column align-center">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <circle :cx="size/2" :cy="size/2" :r="radius" fill="none" stroke="#e0e0e0" :stroke-width="strokeWidth" />
      <circle :cx="size/2" :cy="size/2" :r="radius" fill="none" :stroke="color" :stroke-width="strokeWidth"
        :stroke-dasharray="circumference" :stroke-dashoffset="offset"
        stroke-linecap="round" :transform="`rotate(-90 ${size/2} ${size/2})`"
        style="transition: stroke-dashoffset 0.5s ease" />
      <text :x="size/2" :y="size/2" text-anchor="middle" dominant-baseline="central" class="text-h6">
        {{ Math.round(value) }}%
      </text>
    </svg>
    <span v-if="label" class="text-caption text-medium-emphasis">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: Number,
    default: 0,
    validator: (val) => val >= 0 && val <= 100
  },
  color: {
    type: String,
    default: 'rgb(var(--v-theme-primary))'
  },
  size: {
    type: Number,
    default: 120
  },
  label: {
    type: String,
    default: ''
  }
});

const strokeWidth = computed(() => props.size * 0.1);
const radius = computed(() => (props.size - strokeWidth.value) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);

const offset = computed(() => {
  const percentage = Math.min(Math.max(props.value, 0), 100) / 100;
  return circumference.value * (1 - percentage);
});
</script>

<style scoped>
svg {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}
</style>
