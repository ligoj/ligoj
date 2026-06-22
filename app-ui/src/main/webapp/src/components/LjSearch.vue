<!--
  LjSearch — the 2026 search field, factored out of ~14 views that each
  hand-rolled `.search` / `.search-ic` / `.search input` / `.search-x`.

    <LjSearch v-model="query" :placeholder="t('user.searchPlaceholder')" @update:model-value="page = 1" />

  Plain text input wrapped in a focus-ring chrome; emits both `update:modelValue`
  (v-model) and `input` for callers that reset paging on keystroke. Reads its
  colours/shape from the enclosing `.lj-surface` root.
-->
<template>
  <label class="search">
    <v-icon size="17" class="search-ic">mdi-magnify</v-icon>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      @input="onInput"
    />
    <button v-if="clearable && modelValue" class="search-x" :aria-label="clearLabel" @click.prevent="clear">
      <v-icon size="15">mdi-close</v-icon>
    </button>
  </label>
</template>

<script setup>
import { useI18nStore } from '@ligoj/host'

defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  clearable: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'input'])
const { t } = useI18nStore()
const clearLabel = t('common.cancel')

function onInput(e) {
  emit('update:modelValue', e.target.value)
  emit('input', e)
}
function clear() {
  emit('update:modelValue', '')
  emit('input', { target: { value: '' } })
}
</script>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 200px;
  max-width: 420px;
  padding: 9px 14px;
  border-radius: var(--radius-sm, var(--lj-radius-sm, 8px));
  border: var(--border-w, var(--lj-border-width, 1px)) var(--lj-border-style, solid) var(--border-c, var(--border, rgba(var(--v-theme-on-surface), .12)));
  background: var(--surface, rgb(var(--v-theme-surface)));
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .55));
  transition: border-color .15s, box-shadow .15s;
}
.search:focus-within {
  border-color: var(--accent, rgb(var(--v-theme-secondary)));
  box-shadow: 0 0 0 4px rgba(var(--v-theme-secondary), .15);
}
.search-ic { color: var(--ink-3, rgba(var(--v-theme-on-surface), .55)); flex: none; }
.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--font, "Bricolage Grotesque", system-ui, sans-serif);
  font-size: 14px;
  color: var(--ink, rgb(var(--v-theme-on-surface)));
}
.search input::placeholder { color: var(--ink-3, rgba(var(--v-theme-on-surface), .55)); }
.search-x {
  flex: none;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .55));
  border-radius: 50%;
  width: 22px;
  height: 22px;
}
.search-x:hover { color: var(--ink, rgb(var(--v-theme-on-surface))); background: var(--hover, rgba(var(--v-theme-on-surface), .06)); }
</style>
