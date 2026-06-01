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
          <tr v-if="loading && !items.length" class="state-row">
            <td :colspan="colCount"><div class="state"><span class="spin" />{{ t('common.loading') || 'Chargement…' }}</div></td>
          </tr>
          <tr v-else-if="!items.length" class="state-row">
            <td :colspan="colCount"><div class="state muted">{{ emptyText || (t('common.noData') || 'Aucune donnée') }}</div></td>
          </tr>
          <template v-else>
            <tr v-for="(item, i) in items" :key="rowKey(item, i)" :class="{ 'is-selected': isSelected(item) }" @click="$emit('row-click', item)">
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
import { ref, computed, watch, onMounted } from 'vue'
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
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);

  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 18px 40px -30px rgba(0, 0, 0, .45);
}
.tscroll { overflow-x: auto; }

.vtable { width: 100%; border-collapse: collapse; }

thead th {
  text-align: left; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  color: var(--ink-3); padding: 14px 16px; border-bottom: 1px solid var(--border); background: var(--thead); white-space: nowrap; user-select: none;
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
tbody tr { transition: background .12s; cursor: pointer; }
tbody tr:hover { background: var(--hover); }
tbody tr.is-selected { background: rgba(var(--v-theme-primary), .07); }
tbody tr:last-child td { border-bottom: 0; }

.state-row td { cursor: default; }
.state { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 30px 0; color: var(--ink-2); font-weight: 600; font-size: 13.5px; }
.state.muted { color: var(--ink-3); }
.spin { width: 16px; height: 16px; border: 2px solid var(--border-2); border-top-color: var(--accent); border-radius: 50%; animation: vspin .7s linear infinite; }
@keyframes vspin { to { transform: rotate(360deg); } }

/* Custom rounded checkbox (matches mockup .cbx). */
.cbx-col { width: 46px; text-align: center; }
.cbx {
  width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--border-2); display: inline-grid; place-items: center;
  cursor: pointer; background: var(--surface); vertical-align: middle; transition: background .12s, border-color .12s;
}
.cbx:hover { border-color: var(--accent); }
.cbx.on { background: var(--accent); border-color: var(--accent); }
.cbx.on::after { content: ""; width: 9px; height: 5px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; transform: rotate(-45deg) translateY(-1px); }

.gear-col { width: 64px; }

/* Footer pagination (matches mockup .pg). */
.pg { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding: 12px 16px; color: var(--ink-3); font-size: 13px; font-weight: 600; border-top: 1px solid var(--border); }
.pg-rows { display: inline-flex; align-items: center; gap: 6px; }
.pp-sel select {
  font-family: var(--font); font-size: 13px; font-weight: 700; color: var(--ink); background: var(--surface);
  border: 1px solid var(--border); border-radius: 8px; padding: 3px 6px; cursor: pointer;
}
.pg-nav { display: inline-flex; gap: 6px; }
.iconbtn { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--border); background: transparent; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-2); transition: background .12s, color .12s; }
.iconbtn:hover:not(:disabled) { background: var(--hover); color: var(--ink); }
.iconbtn:disabled { opacity: .4; cursor: not-allowed; }
</style>
