<template>
  <div class="sunburst-container" :style="{ width: size + 'px', height: size + 'px' }">
    <div v-for="child in data.children" :key="child.name"
      class="treemap-cell"
      :style="{ flex: child.value, backgroundColor: child.color }"
      :title="`${child.name}: ${child.value}`"
      @click="handleSelect(child)">
      <span class="cell-label text-caption">{{ child.name }}</span>
      <span class="cell-value text-caption">{{ child.value }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    default: () => ({ name: '', value: 0, color: '#ccc', children: [] })
  },
  size: {
    type: Number,
    default: 300
  }
});

const emit = defineEmits(['select']);

const handleSelect = (child) => {
  emit('select', child);
};
</script>

<style scoped>
.sunburst-container {
  display: flex;
  flex-wrap: wrap;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 4px;
  overflow: hidden;
}
.treemap-cell {
  min-height: 40px;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.3);
  transition: opacity 0.2s ease, transform 0.2s ease;
  position: relative;
  padding: 8px;
  gap: 4px;
}
.treemap-cell:hover {
  opacity: 0.9;
  transform: scale(1.02);
  z-index: 1;
}
.cell-label {
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  text-align: center;
  word-break: break-word;
}
.cell-value {
  color: rgba(255,255,255,0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  font-weight: 500;
}
</style>
