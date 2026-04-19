<template>
  <div class="stacked-bar-chart">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <g v-for="(item, idx) in bars" :key="idx" :transform="`translate(0, ${idx * barHeight})`">
        <text x="10" :y="barHeight / 2" dominant-baseline="middle" class="bar-label text-caption">
          {{ item.label }}
        </text>
        <g :transform="`translate(${labelWidth}, 0)`">
          <rect v-for="(seg, i) in item.segments" :key="i"
            :x="seg.x" :y="padding" :width="seg.width" :height="barHeight - 2 * padding"
            :fill="seg.color" class="bar-segment"
            :title="`${seg.key}: ${seg.value}`" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  height: {
    type: Number,
    default: 300
  }
});

const width = 600;
const labelWidth = 150;
const padding = 4;
const barHeight = computed(() => props.height / Math.max(props.data.length, 1));

const maxTotal = computed(() => {
  return Math.max(...props.data.map(item =>
    item.segments.reduce((sum, seg) => sum + seg.value, 0)
  ), 1);
});

const barWidth = computed(() => width - labelWidth - 20);

const bars = computed(() => {
  return props.data.map(item => {
    const total = item.segments.reduce((sum, seg) => sum + seg.value, 0);
    let currentX = 0;

    const segments = item.segments.map(seg => {
      const segWidth = (seg.value / maxTotal.value) * barWidth.value;
      const x = currentX;
      currentX += segWidth;

      return {
        ...seg,
        x,
        width: segWidth
      };
    });

    return {
      label: item.label,
      segments
    };
  });
});
</script>

<style scoped>
.stacked-bar-chart {
  overflow-x: auto;
}
.bar-segment {
  transition: opacity 0.2s ease;
  cursor: pointer;
}
.bar-segment:hover {
  opacity: 0.8;
}
.bar-label {
  font-size: 12px;
  fill: currentColor;
}
</style>
