<!--
  LjSegmented — the 2026 segmented tab control, factored out of the views
  that hand-rolled `.seg` / `.seg button` / `.seg button.on`.

    <LjSegmented v-model="activeTab" :options="[
      { value: 'group',   icon: 'mdi-account-group', label: t('nav.groups') },
      { value: 'company', icon: 'mdi-domain',        label: t('nav.companies') },
    ]" />

  Reads its colours/shape from the enclosing `.lj-surface` root.
-->
<template>
  <div class="seg">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="{ on: opt.value === modelValue }"
      @click="$emit('update:modelValue', opt.value)"
    >
      <v-icon v-if="opt.icon" size="16">{{ opt.icon }}</v-icon>{{ opt.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: null },
  // [{ value, icon?, label }]
  options: { type: Array, required: true },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.seg {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: var(--border-w, var(--lj-border-width, 1px)) var(--lj-border-style, solid) var(--border-c, var(--border, rgba(var(--v-theme-on-surface), .12)));
  border-radius: var(--radius-sm, var(--lj-radius-sm, 8px));
  background: var(--surface, rgb(var(--v-theme-surface)));
}
.seg button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  background: transparent;
  padding: 8px 15px;
  border-radius: var(--lj-radius-sm, 8px);
  cursor: pointer;
  font-family: var(--font, "Bricolage Grotesque", system-ui, sans-serif);
  font-weight: 700;
  font-size: 13px;
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .55));
  transition: background .15s, color .15s;
}
.seg button:hover { color: var(--ink, rgb(var(--v-theme-on-surface))); }
.seg button.on {
  color: #fff;
  background: linear-gradient(135deg, #ff9436, #ff5a52);
  box-shadow: 0 6px 14px -8px rgba(255, 90, 82, .6);
}
</style>
