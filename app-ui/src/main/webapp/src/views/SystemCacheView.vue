<!--
  SystemCacheView — 2026 "Vibrant" cache monitor (Administration → Caches).
  Ports plugin-ui's SystemCacheView logic (rest/system/cache list + per-cache
  invalidate via POST rest/system/cache/{id}) onto the Vibrant chrome:
  breadcrumb-chip header with a search box, KPI stat cards (caches / entries /
  global hit rate / avg get time), VibrantDataTable with a db glyph, hit/miss
  rate chips and a per-row flush action. Read-only dashboard otherwise.
-->
<template>
  <div class="caches">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb"><v-icon size="13">mdi-cog-outline</v-icon>{{ t('system.breadcrumb') }}</span><span class="csep">›</span><span class="crumb cur">{{ t('system.cache.title') }}</span></nav>
        <h1>{{ t('system.cache.title') }}</h1>
        <p class="sub"><b>{{ items.length }}</b> {{ t('system.cache.countLabel') }}<span v-if="filtered.length !== items.length"> · {{ filtered.length }} {{ t('system.role.filtered') }}</span></p>
      </div>
      <div class="ph-actions">
        <div class="search">
          <v-icon size="17" class="search-ic">mdi-magnify</v-icon>
          <input v-model="query" type="text" :placeholder="t('system.cache.searchPlaceholder')" @input="page = 1" />
          <button v-if="query" class="search-x" @click="query = ''"><v-icon size="15">mdi-close</v-icon></button>
        </div>
      </div>
    </header>

    <div class="stats">
      <div v-for="(s, i) in stats" :key="s.key" class="stat" :style="{ '--c': s.color, 'animation-delay': (i * 50) + 'ms' }">
        <div class="stop">
          <span class="sicon"><v-icon size="22">{{ s.icon }}</v-icon></span>
          <div class="sbody"><div class="snum">{{ s.value }}<small v-if="s.unit">{{ s.unit }}</small></div><div class="slabel">{{ s.label }}<span v-if="s.sub" class="ssub"> · {{ s.sub }}</span></div></div>
        </div>
        <div class="sbar"><i :style="{ width: s.pct + '%' }" /></div>
      </div>
    </div>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

    <VibrantDataTable :headers="headers" :items="paged" :items-length="filtered.length" :loading="loading" item-value="id" default-sort="hitCount" default-order="desc"
      :empty-text="t('common.noData')" @update:options="onOptions">
      <template #cell.id="{ item }">
        <div class="avatar-cell" :class="{ idle: isIdle(item) }">
          <span class="cglyph" :class="{ live: !isIdle(item) }"><v-icon size="18">mdi-database-outline</v-icon></span>
          <code class="cname">{{ item.id }}</code>
        </div>
      </template>
      <template #cell.size="{ item }"><span class="num" :class="{ zero: !(item.size) }">{{ (item.size ?? 0).toLocaleString() }}</span></template>
      <template #cell.hitCount="{ item }">
        <div class="metric">
          <span class="rate">
            <span class="num" :class="{ zero: !(item.hitCount) }">{{ (item.hitCount ?? 0).toLocaleString() }}</span>
            <span v-if="item.hitPercentage != null && (item.hitCount ?? 0) > 0" class="ratechip" :class="rateClass(item.hitPercentage, true, item.hitCount)">{{ Math.round(item.hitPercentage) }}%</span>
          </span>
          <span v-if="item.hitPercentage != null && (item.hitCount ?? 0) > 0" class="mbar"><i class="hit" :style="{ width: item.hitPercentage + '%' }" /></span>
        </div>
      </template>
      <template #cell.missCount="{ item }">
        <div class="metric">
          <span class="rate">
            <span class="num" :class="{ zero: !(item.missCount) }">{{ (item.missCount ?? 0).toLocaleString() }}</span>
            <span v-if="item.missPercentage != null && (item.missCount ?? 0) > 1" class="ratechip" :class="rateClass(100 - item.missPercentage, false)">{{ Math.round(item.missPercentage) }}%</span>
          </span>
          <span v-if="item.missPercentage != null && (item.missCount ?? 0) > 1" class="mbar"><i class="miss" :style="{ width: item.missPercentage + '%' }" /></span>
        </div>
      </template>
      <template #cell.averageGetTime="{ item }"><span class="num" :class="{ zero: !item.averageGetTime }">{{ item.averageGetTime ?? '—' }}</span></template>
      <template #actions="{ item }">
        <button class="iconbtn" :disabled="invalidating === item.id" @click.stop="invalidate(item)">
          <span v-if="invalidating === item.id" class="ispin" aria-hidden="true" /><v-icon v-else size="18">mdi-broom</v-icon>
          <v-tooltip activator="parent" :text="t('system.cache.invalidate')" location="top" />
        </button>
      </template>
    </VibrantDataTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi, useAppStore, useI18nStore } from '@ligoj/host'
import VibrantDataTable from '@/components/VibrantDataTable.vue'

const api = useApi()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const items = ref([])
const loading = ref(false)
const error = ref(null)
const invalidating = ref(null)

const query = ref('')
const page = ref(1)
const perPage = ref(25)
const sortKey = ref('id')
const sortOrder = ref('asc')
function onOptions(o) {
  page.value = o.page
  perPage.value = o.itemsPerPage
  sortKey.value = o.sortBy?.[0]?.key || 'id'
  sortOrder.value = o.sortBy?.[0]?.order || 'asc'
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? items.value.filter((c) => String(c.id || '').toLowerCase().includes(q)) : items.value
})
const sorted = computed(() => {
  const arr = [...filtered.value]
  const k = sortKey.value
  const numeric = ['size', 'hitCount', 'missCount', 'averageGetTime'].includes(k)
  arr.sort((a, b) => {
    if (numeric) return (sortOrder.value === 'desc' ? -1 : 1) * ((a[k] ?? 0) - (b[k] ?? 0))
    const va = String(a[k] ?? '').toLowerCase(); const vb = String(b[k] ?? '').toLowerCase()
    return sortOrder.value === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb)
  })
  return arr
})
const paged = computed(() => {
  const start = (page.value - 1) * perPage.value
  return sorted.value.slice(start, start + perPage.value)
})

const headers = computed(() => [
  { key: 'id', label: t('system.cache.headerName'), sortable: true, icon: 'mdi-database-outline' },
  { key: 'size', label: t('system.cache.headerSize'), sortable: true, align: 'center', icon: 'mdi-counter' },
  { key: 'hitCount', label: t('system.cache.headerHits'), sortable: true, icon: 'mdi-check-circle-outline' },
  { key: 'missCount', label: t('system.cache.headerMisses'), sortable: true, icon: 'mdi-alert-circle-outline' },
  { key: 'averageGetTime', label: t('system.cache.headerAvgGet'), sortable: true, align: 'center', icon: 'mdi-timer-outline' },
])

function rateClass(score, hit, hitCount) {
  if (hit && hitCount === 1) return 'ok'
  if (score >= 90) return 'ok'
  if (score >= 80) return 'info'
  if (score >= 50) return 'warn'
  return 'err'
}

// A cache is "idle" when it holds nothing and has seen no traffic — de-emphasise
// these so the active caches stand out.
function isIdle(c) { return !(c.size) && !(c.hitCount) && !(c.missCount) }

const stats = computed(() => {
  const total = items.value.length
  const totalHits = items.value.reduce((s, c) => s + (c.hitCount ?? 0), 0)
  const totalMiss = items.value.reduce((s, c) => s + (c.missCount ?? 0), 0)
  const entries = items.value.reduce((s, c) => s + (c.size ?? 0), 0)
  const active = items.value.filter((c) => !isIdle(c)).length
  const withEntries = items.value.filter((c) => (c.size ?? 0) > 0).length
  const reqs = totalHits + totalMiss
  const hitRate = reqs ? Math.round(totalHits / reqs * 100) : 0
  const times = items.value.map((c) => c.averageGetTime).filter((v) => typeof v === 'number' && v > 0)
  const avgGet = times.length ? (times.reduce((s, v) => s + v, 0) / times.length) : 0
  return [
    { key: 'caches', label: t('system.cache.statCaches'), sub: `${active} ${t('system.cache.subActive')}`, icon: 'mdi-database-outline', color: 'rgb(var(--v-theme-secondary))', value: total, pct: total ? Math.round(active / total * 100) : 0 },
    { key: 'entries', label: t('system.cache.statEntries'), sub: t('system.cache.subInCaches', { n: withEntries }), icon: 'mdi-counter', color: '#2f6df6', value: entries.toLocaleString(), pct: total ? Math.round(withEntries / total * 100) : 0 },
    { key: 'hit', label: t('system.cache.statHitRate'), sub: `${reqs.toLocaleString()} ${t('system.cache.subRequests')}`, icon: 'mdi-check-circle-outline', color: '#1d9d63', value: hitRate, unit: '%', pct: hitRate },
    { key: 'avg', label: t('system.cache.statAvgGet'), sub: t('system.cache.subAcrossActive'), icon: 'mdi-timer-outline', color: '#8b5cf6', value: avgGet ? avgGet.toFixed(2) : '0', unit: ' ms', pct: Math.min(100, avgGet * 20) },
  ]
})

async function load() {
  loading.value = true; error.value = null
  try {
    const data = await api.get('rest/system/cache')
    if (Array.isArray(data)) items.value = data
    else if (data === null) error.value = t('system.cache.errorLoad')
  } catch { error.value = t('system.cache.errorLoad') }
  loading.value = false
}

async function invalidate(item) {
  invalidating.value = item.id
  try { await api.post(`rest/system/cache/${encodeURIComponent(item.id)}`); load() }
  finally { invalidating.value = null }
}

onMounted(() => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('system.breadcrumb') }, { title: t('system.cache.title') }], { refresh: load })
  load()
})
</script>

<style scoped>
.caches {
  --surface: rgb(var(--v-theme-surface));
  --card: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
  color: var(--ink);
}
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
.crumbs { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.crumb { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font); font-size: 11.5px; font-weight: 700; color: var(--ink-3); background: var(--pill); border-radius: 999px; padding: 3px 10px; }
.crumb.cur { color: var(--accent); background: rgba(var(--v-theme-secondary), .12); }
.csep { color: var(--ink-3); font-size: 12px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.ph-txt .sub b { color: var(--ink-2); font-family: var(--mono); }
.ph-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search { display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; height: 42px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); min-width: 240px; transition: border-color .15s; }
.search:focus-within { border-color: var(--border-2); }
.search-ic { color: var(--ink-3); }
.search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-family: var(--font); font-size: 13.5px; font-weight: 500; min-width: 0; }
.search input::placeholder { color: var(--ink-3); }
.search-x { border: 0; background: transparent; cursor: pointer; color: var(--ink-3); display: grid; place-items: center; padding: 2px; border-radius: 6px; }
.search-x:hover { color: var(--ink); background: var(--hover); }

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
.stat { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--border); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 9%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); opacity: 0; transform: translateY(10px); animation: rise .5s cubic-bezier(.2, .7, .3, 1) forwards; transition: transform .18s cubic-bezier(.2, .7, .3, 1), box-shadow .18s, border-color .18s; }
@keyframes rise { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .stat { animation: none; opacity: 1; transform: none; } }
.stat:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -20px color-mix(in srgb, var(--c) 55%, transparent); border-color: color-mix(in srgb, var(--c) 30%, var(--border)); }
.stop { display: flex; align-items: center; gap: 14px; }
.sicon { width: 46px; height: 46px; border-radius: 13px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.snum { font-family: var(--mono); font-weight: 700; font-size: 26px; line-height: 1; color: var(--ink); }
.snum small { font-size: 14px; font-weight: 600; color: var(--ink-3); margin-left: 1px; }
.slabel { font-size: 12.5px; font-weight: 600; color: var(--ink-3); margin-top: 4px; }
.ssub { font-weight: 500; color: var(--ink-3); opacity: .8; }
.sbar { height: 6px; border-radius: 4px; background: var(--pill); overflow: hidden; }
.sbar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 55%, white)); transition: width .5s cubic-bezier(.2, .7, .3, 1); }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

.avatar-cell { display: flex; align-items: center; gap: 12px; transition: opacity .15s; }
.avatar-cell.idle { opacity: .45; }
.cglyph { width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; background: var(--pill); color: var(--ink-3); }
.cglyph.live { background: rgba(29, 157, 99, .13); color: #1d9d63; }
.cname { font-family: var(--mono); font-size: 12.5px; font-weight: 600; color: var(--ink); word-break: break-all; }
.num { font-family: var(--mono); font-size: 13px; color: var(--ink-2); }
.num.zero { color: var(--ink-3); opacity: .5; }
.metric { display: flex; flex-direction: column; gap: 5px; }
.rate { display: inline-flex; align-items: center; gap: 8px; }
.mbar { display: block; height: 4px; border-radius: 3px; background: var(--pill); overflow: hidden; max-width: 110px; }
.mbar i { display: block; height: 100%; border-radius: 3px; }
.mbar i.hit { background: linear-gradient(90deg, #1d9d63, #2bc47e); }
.mbar i.miss { background: linear-gradient(90deg, #d9701a, #e0a106); }
.ratechip { font-family: var(--font); font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.ratechip.ok { color: #1d9d63; background: rgba(29, 157, 99, .14); }
.ratechip.info { color: #2f6df6; background: rgba(47, 109, 246, .13); }
.ratechip.warn { color: #d9701a; background: rgba(217, 112, 26, .14); }
.ratechip.err { color: #df4d42; background: rgba(223, 77, 66, .14); }
.iconbtn { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: inline-grid; place-items: center; color: var(--ink-3); transition: background .15s, color .15s; }
.iconbtn:hover:not(:disabled) { background: rgba(217, 112, 26, .12); color: #d9701a; }
.iconbtn:disabled { opacity: .6; cursor: default; }
.ispin { width: 15px; height: 15px; border: 2px solid var(--border-2); border-top-color: var(--accent); border-radius: 50%; animation: ispin .7s linear infinite; }
@keyframes ispin { to { transform: rotate(360deg); } }
</style>
