<!--
  VibrantDataTable — the 2026 "Vibrant" data table for app-ui-2026.

  Pixel-faithful to the validated mockup (design/ligoj-2026-prototype.html):
  tinted uppercase header, hover rows, custom rounded checkbox, gear column,
  and a "Lignes : N / a–b sur total" footer. It owns ONLY presentation +
  sort/pagination/selection UI state; data fetching stays in the caller's
  useDataTable instance. The caller passes items/itemsLength/loading and
  listens to @update:options to (re)load, exactly like LigojDataTableServer.

  Theme-adaptive: every colour derives from rgb(var(--v-theme-*)) so it
  follows the active Vuetify preset (light/dark), per the 2026 rule.

  Cells render through #cell.<key> slots (fallback: raw value); the trailing
  gear column renders through the #actions slot. Header cells can opt into
  an mdi icon via header.icon.
-->
<template>
  <div class="panel">
    <div class="tscroll">
      <table class="vtable">
        <thead>
          <tr>
            <th v-if="selectable" class="cbx-col">
              <span class="cbx" :class="{ on: allSelected }" role="checkbox" :aria-checked="allSelected" tabindex="0"
                @click="toggleAll" @keydown.enter.prevent="toggleAll" @keydown.space.prevent="toggleAll" />
            </th>
            <th v-for="h in headers" :key="h.key" :class="[h.align === 'center' && 'center', h.align === 'end' && 'end', h.sortable && 'sortable', sortKey === h.key && 'sorted']"
              :style="h.width ? { width: h.width } : null" @click="h.sortable && toggleSort(h.key)">
              <span class="th-in" :class="{ center: h.align === 'center', end: h.align === 'end' }">
                <v-icon v-if="h.icon" size="14" class="th-icon">{{ h.icon }}</v-icon>
                <span v-if="h.label">{{ h.label }}</span>
                <v-icon v-if="h.sortable" size="14" class="sort-icon" :class="{ active: sortKey === h.key }">
                  {{ sortKey === h.key && sortOrder === 'desc' ? 'mdi-arrow-down' : 'mdi-arrow-up' }}
                </v-icon>
              </span>
            </th>
            <th v-if="$slots.actions" class="end gear-col" />
          </tr>
        </thead>
        <tbody>
          <!-- Loading: shimmer skeleton rows (keeps the column rhythm). -->
          <template v-if="loading && !items.length">
            <tr v-for="n in 6" :key="'sk' + n" class="skel-row">
              <td v-if="selectable" class="cbx-col"><span class="skbar sk-cbx" /></td>
              <td v-for="h in headers" :key="h.key" :class="[h.align === 'center' && 'center', h.align === 'end' && 'end']"><span class="skbar" :style="{ width: skWidth(h, n) }" /></td>
              <td v-if="$slots.actions" class="end gear-col"><span class="skbar sk-cbx" /></td>
            </tr>
          </template>
          <!-- Empty: illustrated state. -->
          <tr v-else-if="!items.length" class="state-row">
            <td :colspan="colCount">
              <div class="empty">
                <span class="empty-ic"><v-icon size="30">mdi-database-off-outline</v-icon></span>
                <p>{{ emptyText || (t('common.noData') || 'Aucune donnée') }}</p>
              </div>
            </td>
          </tr>
          <template v-else>
            <tr v-for="(item, i) in items" :key="rowKey(item, i)" class="row-in" :style="{ animationDelay: Math.min(i, 18) * 28 + 'ms' }" :class="{ 'is-selected': isSelected(item), clickable: hasRowClick }" @click="hasRowClick && $emit('row-click', item)">
              <td v-if="selectable" class="cbx-col" @click.stop>
                <span class="cbx" :class="{ on: isSelected(item) }" role="checkbox" :aria-checked="isSelected(item)" tabindex="0"
                  @click="toggleOne(item)" @keydown.enter.prevent="toggleOne(item)" @keydown.space.prevent="toggleOne(item)" />
              </td>
              <td v-for="h in headers" :key="h.key" :class="[h.align === 'center' && 'center', h.align === 'end' && 'end']">
                <slot :name="`cell.${h.key}`" :item="item" :value="item[h.key]">{{ item[h.key] }}</slot>
              </td>
              <td v-if="$slots.actions" class="end gear-col" @click.stop>
                <slot name="actions" :item="item" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="pg">
      <span class="pg-rows">
        {{ t('common.rows') || 'Lignes' }} :
        <span class="pp-sel">
          <select :value="itemsPerPage" @change="onPerPage($event.target.value)">
            <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}</option>
          </select>
        </span>
      </span>
      <span class="pg-range">{{ rangeLabel }}</span>
      <span class="pg-nav">
        <button class="iconbtn" :disabled="page <= 1" :title="t('common.previous') || 'Précédent'" @click="goTo(page - 1)"><v-icon size="18">mdi-chevron-left</v-icon></button>
        <button class="iconbtn" :disabled="page >= pageCount" :title="t('common.next') || 'Suivant'" @click="goTo(page + 1)"><v-icon size="18">mdi-chevron-right</v-icon></button>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
import { useI18nStore } from '@ligoj/host'

const props = defineProps({
  headers: { type: Array, required: true },
  items: { type: Array, default: () => [] },
  itemsLength: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  modelValue: { type: Array, default: () => [] }, // selected item-values
  itemValue: { type: String, default: 'id' },
  defaultSort: { type: String, default: '' },
  defaultOrder: { type: String, default: 'asc' },
  perPageOptions: { type: Array, default: () => [10, 25, 50, 100] },
  emptyText: { type: String, default: '' },
})
const emit = defineEmits(['update:options', 'update:modelValue', 'row-click'])

const i18n = useI18nStore()
const t = i18n.t

// `row-click` is opt-in: rows show the pointer cursor and emit the
// click only when the caller actually listens for it. Avoids the
// dead-pointer UX where rows look clickable but do nothing.
// NB: `row-click` is a declared emit, so its listener is stripped from
// $attrs — we read the binding off the creating vnode props instead.
const instance = getCurrentInstance()
const hasRowClick = computed(() => !!instance.vnode.props?.onRowClick)

const page = ref(1)
const itemsPerPage = ref(props.perPageOptions.includes(25) ? 25 : props.perPageOptions[0])
const sortKey = ref(props.defaultSort)
const sortOrder = ref(props.defaultOrder)

const colCount = computed(() => props.headers.length + (props.selectable ? 1 : 0) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil((props.itemsLength || 0) / itemsPerPage.value)))

const rangeLabel = computed(() => {
  const total = props.itemsLength || 0
  if (!total) return `0 ${t('common.of') || 'sur'} 0`
  const from = (page.value - 1) * itemsPerPage.value + 1
  const to = Math.min(page.value * itemsPerPage.value, total)
  return `${from}–${to} ${t('common.of') || 'sur'} ${total.toLocaleString()}`
})

function emitOptions() {
  emit('update:options', {
    page: page.value,
    itemsPerPage: itemsPerPage.value,
    sortBy: sortKey.value ? [{ key: sortKey.value, order: sortOrder.value }] : [],
  })
}

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  page.value = 1
  emitOptions()
}

function goTo(p) {
  const np = Math.min(Math.max(1, p), pageCount.value)
  if (np !== page.value) { page.value = np; emitOptions() }
}

function onPerPage(v) {
  itemsPerPage.value = Number(v)
  page.value = 1
  emitOptions()
}

/* Selection (by item-value, mirrors v-data-table show-select). */
function val(item) { return item[props.itemValue] }
function isSelected(item) { return props.modelValue.includes(val(item)) }
const allSelected = computed(() => props.items.length > 0 && props.items.every(isSelected))
function toggleOne(item) {
  const v = val(item)
  const next = props.modelValue.includes(v) ? props.modelValue.filter((x) => x !== v) : [...props.modelValue, v]
  emit('update:modelValue', next)
}
function toggleAll() {
  if (allSelected.value) {
    const pageVals = props.items.map(val)
    emit('update:modelValue', props.modelValue.filter((x) => !pageVals.includes(x)))
  } else {
    const merged = new Set([...props.modelValue, ...props.items.map(val)])
    emit('update:modelValue', [...merged])
  }
}
function rowKey(item, i) { return val(item) ?? i }

/* When the caller resets the search it expects page 1; expose nothing but
   keep the first load consistent — emit once on mount via watch on items
   length is avoided to not double-fetch (caller triggers the first load). */
watch(() => props.perPageOptions, () => {
  if (!props.perPageOptions.includes(itemsPerPage.value)) itemsPerPage.value = props.perPageOptions[0]
})

/* Allow the parent to force page 1 after a search by resetting via key, but
   also expose a tiny imperative reset for convenience. */
defineExpose({
  reset() { page.value = 1; emitOptions() },
  reload() { emitOptions() },
})

/* Deterministic skeleton bar width: varied per column + row so the shimmer
   looks organic without Math.random (stable across re-renders). */
function skWidth(h, n) {
  if (h.align === 'center' || h.align === 'end') return '40%'
  const base = [82, 64, 73, 58, 90, 68][(n + (h.key?.length || 0)) % 6]
  return base + '%'
}

// Trigger the first load (the parent listens to @update:options to fetch).
// LigojDataTableServer did this implicitly via v-data-table-server; our
// custom table must emit the initial options itself.
onMounted(emitOptions)
</script>

<style scoped>
.panel {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --thead: rgba(var(--v-theme-on-surface), .035);
  --hover: rgba(var(--v-theme-on-surface), .05);
  --accent: rgb(var(--v-theme-primary));
  /* Shape / type from the active style's design tokens (see
   * assets/vuetify-overrides.css). Fall back to the panel defaults so the
   * component still renders standalone (tests / Storybook). */
  --font: var(--lj-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--lj-mono, "JetBrains Mono", ui-monospace, monospace);

  background: var(--surface);
  border: var(--lj-border-width, 1px) var(--lj-border-style, solid) var(--lj-border-color, var(--border));
  border-radius: var(--lj-radius, 18px);
  overflow: hidden;
  box-shadow: var(--lj-shadow, 0 18px 40px -30px rgba(0, 0, 0, .45));
  font-family: var(--font);
}
.tscroll { overflow-x: auto; }

.vtable { width: 100%; border-collapse: collapse; }

thead th {
  text-align: left; font-size: 11.5px; font-weight: var(--lj-weight-bold, 700); text-transform: uppercase; letter-spacing: .04em;
  color: var(--ink-3); padding: var(--lj-space, 14px) 16px; border-bottom: var(--lj-border-width, 1px) var(--lj-border-style, solid) var(--lj-border-color, var(--border)); background: var(--thead); white-space: nowrap; user-select: none;
}
thead th.center { text-align: center; }
thead th.end { text-align: right; }
thead th.sortable { cursor: pointer; transition: color .12s; }
thead th.sortable:hover { color: var(--ink); }
thead th.sorted { color: var(--ink); }
.th-in { display: inline-flex; align-items: center; gap: 6px; }
.th-in.center { justify-content: center; }
.th-in.end { justify-content: flex-end; }
.th-icon { opacity: .65; }
.sort-icon { opacity: 0; transition: opacity .12s; }
thead th.sortable:hover .sort-icon { opacity: .4; }
.sort-icon.active { opacity: .9; color: var(--accent); }

tbody td { padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 13.5px; font-weight: 500; color: var(--ink); }
tbody td.center { text-align: center; }
tbody td.end { text-align: right; }
tbody tr { transition: background .14s; }
tbody tr.clickable { cursor: pointer; }
tbody tr:hover { background: var(--hover); }
/* Left accent bar on hover for a premium, scannable feel. */
tbody tr.clickable:hover td:first-child { box-shadow: inset 3px 0 0 0 var(--accent); }
tbody tr.is-selected { background: rgba(var(--v-theme-primary), .07); }
tbody tr.is-selected td:first-child { box-shadow: inset 3px 0 0 0 var(--accent); }
tbody tr:last-child td { border-bottom: 0; }

/* Staggered row entrance. */
.row-in { animation: rowin .34s cubic-bezier(.2, .7, .3, 1) both; }
@keyframes rowin { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .row-in { animation: none; } }

.state-row td { cursor: default; }
/* Illustrated empty state. */
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 48px 0; color: var(--ink-3); }
.empty-ic { width: 60px; height: 60px; border-radius: var(--lj-radius, 18px); display: grid; place-items: center; color: var(--ink-3); background: rgba(var(--v-theme-on-surface), .045); }
.empty p { margin: 0; font-weight: 600; font-size: 14px; }

/* Skeleton shimmer rows. */
.skel-row td { cursor: default; }
.skbar { display: block; height: 13px; border-radius: 7px; background: linear-gradient(100deg, var(--hover), rgba(var(--v-theme-on-surface), .12), var(--hover)); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; }
.skbar.sk-cbx { width: 18px; height: 18px; border-radius: 6px; margin: 0 auto; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skbar { animation: none; } }

/* Custom rounded checkbox (matches mockup .cbx). */
.cbx-col { width: 46px; text-align: center; }
.cbx {
  width: 18px; height: 18px; border-radius: calc(var(--lj-radius-sm, 8px) * .6); border: 2px solid var(--border-2); display: inline-grid; place-items: center;
  cursor: pointer; background: var(--surface); vertical-align: middle; transition: background .12s, border-color .12s;
}
.cbx:hover { border-color: var(--accent); }
.cbx.on { background: var(--accent); border-color: var(--accent); }
.cbx.on::after { content: ""; width: 9px; height: 5px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; transform: rotate(-45deg) translateY(-1px); }

.gear-col { width: 88px; white-space: nowrap; }

/* Footer pagination (matches mockup .pg). */
.pg { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding: 12px 16px; color: var(--ink-3); font-size: 13px; font-weight: 600; border-top: 1px solid var(--border); }
.pg-rows { display: inline-flex; align-items: center; gap: 6px; }
.pp-sel select {
  font-family: var(--font); font-size: 13px; font-weight: 700; color: var(--ink); background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--lj-radius-sm, 8px); padding: 3px 6px; cursor: pointer;
}
.pg-nav { display: inline-flex; gap: 6px; }
.iconbtn { width: 32px; height: 32px; border-radius: var(--lj-radius-sm, 9px); border: 1px solid var(--border); background: transparent; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-2); transition: background .12s, color .12s; }
.iconbtn:hover:not(:disabled) { background: var(--hover); color: var(--ink); }
.iconbtn:disabled { opacity: .4; cursor: not-allowed; }
</style>
