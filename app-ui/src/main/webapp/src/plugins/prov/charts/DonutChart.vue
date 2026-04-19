<template>
  <div class="d-flex flex-column align-center">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <circle v-for="(seg, i) in arcs" :key="i"
        :cx="size/2" :cy="size/2" :r="radius"
        fill="none" :stroke="seg.color" :stroke-width="strokeWidth"
        :stroke-dasharray="seg.dashArray" :stroke-dashoffset="seg.dashOffset"
        class="donut-segment" />
      <text :x="size/2" :y="size/2" text-anchor="middle" dominant-baseline="central" class="text-h6">
        {{ total }}
      </text>
    </svg>
    <div class="d-flex flex-wrap justify-center ga-2 mt-2">
      <v-chip v-for="seg in segments" :key="seg.label" :color="seg.color" size="small" variant="flat">
        {{ seg.label }}: {{ seg.value }}
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  segments: {
    type: Array,
    default: () => []
  },
  size: {
    type: Number,
    default: 200
  }
});

const strokeWidth = computed(() => props.size * 0.15);
const radius = computed(() => (props.size - strokeWidth.value) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);

const total = computed(() => {
  return props.segments.reduce((sum, seg) => sum + seg.value, 0);
});

const arcs = computed(() => {
  if (!props.segments.length || total.value === 0) return [];

  let offset = 0;
  return props.segments.map(seg => {
    const percentage = seg.value / total.value;
    const dashLength = circumference.value * percentage;
    const dashArray = `${dashLength} ${circumference.value}`;
    const dashOffset = -offset;

    offset += dashLength;

    return {
      color: seg.color,
      dashArray,
      dashOffset
    };
  });
});
</script>

<style scoped>
.donut-segment {
  transition: opacity 0.3s ease;
}
.donut-segment:hover {
  opacity: 0.8;
}
</style>
