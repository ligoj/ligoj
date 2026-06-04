<!--
  SystemInfoView — 2026 "Vibrant" runtime information dashboard
  (Administration → Information). Ports plugin-ui's SystemInfoView logic
  (rest/system for memory / cpu / date / time zone; appSettings for the build;
  JSESSIONID cookie + auth for the session; PUT rest/system/timezone/{type} to
  edit a time zone) onto the Vibrant chrome: breadcrumb-chip header and a grid
  of Vibrant cards — System (segmented memory bar + cpu + dates), Time zone
  (editable), Session (id + user) and Build. Read-only except the time zones.
-->
<template>
  <div class="sysinfo">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb"><v-icon size="13">mdi-cog-outline</v-icon>{{ t('system.breadcrumb') }}</span><span class="csep">›</span><span class="crumb cur">{{ t('system.info.title') }}</span></nav>
        <h1>{{ t('system.info.title') }}</h1>
        <p class="sub">{{ t('system.info.subtitle') }}</p>
      </div>
    </header>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

    <div class="grid">
      <!-- System (hero) -->
      <section class="card hero" :style="{ '--c': '#2f6df6' }">
        <div class="card-head">
          <span class="ch-ic"><v-icon size="20">mdi-server-outline</v-icon></span>
          <h3>{{ t('system.info.system') }}</h3>
          <span class="used-badge" :class="memLevel"><b>{{ memory.pctUsed }}<small>%</small></b><span>{{ t('system.info.memoryUsed') }}</span></span>
        </div>
        <div class="card-body">
          <div class="mem big">
            <div class="mem-top"><span class="mem-label">{{ t('system.info.memory') }}</span><span class="mem-val">{{ formatSize(memory.used) }} / {{ formatSize(memory.max) }}</span></div>
            <div class="mem-bar" :title="memoryTooltip">
              <i class="seg used" :style="{ width: memory.pctUsed + '%' }" />
              <i class="seg committed" :style="{ width: memory.pctCommittedFree + '%' }" />
            </div>
            <div class="mem-legend">
              <span><span class="dot used" />{{ t('system.info.memoryUsed') }} {{ memory.pctUsed }}%</span>
              <span><span class="dot committed" />{{ t('system.info.memoryCommittedFree') }} {{ memory.pctCommittedFree }}%</span>
              <span><span class="dot free" />{{ t('system.info.memoryFree') }} {{ memory.pctFree }}%</span>
            </div>
          </div>
          <div class="subgrid">
            <div class="tile"><span class="tile-k"><v-icon size="15">mdi-cpu-64-bit</v-icon>{{ t('system.info.cpu') }}</span><span class="tile-v">{{ cpu || '—' }}</span></div>
            <div class="tile"><span class="tile-k"><v-icon size="15">mdi-clock-outline</v-icon>{{ t('system.info.localDate') }}</span><span class="tile-v sm">{{ dateIso || '—' }}</span></div>
            <div class="tile"><span class="tile-k"><v-icon size="15">mdi-timer-sand</v-icon>{{ t('system.info.timestamp') }}</span><span class="tile-v">{{ dateTimestamp || '—' }}</span></div>
          </div>
        </div>
      </section>

      <!-- Time zone -->
      <section class="card" :style="{ '--c': '#1d9d63' }">
        <div class="card-head"><span class="ch-ic"><v-icon size="20">mdi-map-clock</v-icon></span><h3>{{ t('system.info.timezone') }}</h3></div>
        <div class="card-body">
          <label class="ifield"><span class="if-label">{{ t('system.info.timezoneApplication') }}</span>
            <span class="if-box"><v-icon size="16" class="if-ic">mdi-map-clock-outline</v-icon><input v-model="tz.application" type="text" @blur="saveTimeZone('application', tz.application)" @keyup.enter="saveTimeZone('application', tz.application)" /><span v-if="updatingTz === 'application'" class="mspin sm" /></span>
          </label>
          <label class="ifield"><span class="if-label">{{ t('system.info.timezoneSystem') }}</span>
            <span class="if-box"><v-icon size="16" class="if-ic">mdi-map-clock-outline</v-icon><input v-model="tz.default" type="text" @blur="saveTimeZone('default', tz.default)" @keyup.enter="saveTimeZone('default', tz.default)" /><span v-if="updatingTz === 'default'" class="mspin sm" /></span>
          </label>
          <label class="ifield"><span class="if-label">{{ t('system.info.timezoneOriginal') }}</span>
            <span class="if-box readonly"><v-icon size="16" class="if-ic">mdi-map-clock-outline</v-icon><input :value="tz.original" type="text" readonly /></span>
          </label>
        </div>
      </section>

      <!-- Session -->
      <section class="card" :style="{ '--c': '#8b5cf6' }">
        <div class="card-head"><span class="ch-ic"><v-icon size="20">mdi-account-key</v-icon></span><h3>{{ t('system.info.session') }}</h3></div>
        <div class="card-body">
          <div class="frow"><span class="fk"><v-icon size="15">mdi-identifier</v-icon>{{ t('system.info.sessionId') }}</span><span class="fv mono ellip" :title="sessionId">{{ sessionId || '—' }}<button v-if="sessionId" class="copy" :title="t('system.info.copy')" @click="copy(sessionId)"><v-icon size="15">mdi-content-copy</v-icon></button></span></div>
          <div class="frow"><span class="fk"><v-icon size="15">mdi-account-outline</v-icon>{{ t('system.info.sessionUser') }}</span><span class="fv mono">{{ auth.userName || '—' }}</span></div>
        </div>
      </section>

      <!-- Build -->
      <section class="card" :style="{ '--c': '#d9701a' }">
        <div class="card-head"><span class="ch-ic"><v-icon size="20">mdi-source-commit</v-icon></span><h3>{{ t('system.info.build') }}</h3></div>
        <div class="card-body">
          <div class="frow"><span class="fk"><v-icon size="15">mdi-pound</v-icon>{{ t('system.info.buildNumber') }}</span><span class="fv mono"><span class="vtxt" :title="build.number">{{ build.number || '—' }}</span></span></div>
          <div class="frow"><span class="fk"><v-icon size="15">mdi-clock-outline</v-icon>{{ t('system.info.buildTimestamp') }}</span><span class="fv mono">{{ build.timestamp || '—' }}</span></div>
          <div class="frow"><span class="fk"><v-icon size="15">mdi-clock-outline</v-icon>{{ t('system.info.buildDate') }}</span><span class="fv mono">{{ build.date || '—' }}</span></div>
          <div class="frow"><span class="fk"><v-icon size="15">mdi-tag-outline</v-icon>{{ t('system.info.buildVersion') }}</span><span class="fv mono">{{ build.version || '—' }}</span></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useApi, useAppStore, useAuthStore, useClipboard, useI18nStore, APP_BASE } from '@ligoj/host'

const api = useApi()
const app = useAppStore()
const auth = useAuthStore()
const i18n = useI18nStore()
const t = i18n.t
const { copy } = useClipboard()

const error = ref(null)
const updatingTz = ref(null)
const cpu = ref('')
const dateIso = ref('')
const dateTimestamp = ref('')

const memory = reactive({ used: 0, committedFree: 0, free: 0, max: 0, pctUsed: 0, pctCommittedFree: 0, pctFree: 0 })
const tz = reactive({ application: '', default: '', original: '' })

const sessionId = computed(() => getCookie('JSESSIONID') || '')
const memLevel = computed(() => (memory.pctUsed >= 85 ? 'err' : memory.pctUsed >= 70 ? 'warn' : ''))

const build = computed(() => {
  const s = auth.appSettings || {}
  const ts = parseInt(s.buildTimestamp, 10)
  return {
    number: s.buildNumber ?? '',
    timestamp: Number.isNaN(ts) ? (s.buildTimestamp ?? '') : ts,
    date: Number.isNaN(ts) ? '' : new Date(ts).toISOString().slice(0, 19).replace('T', ' '),
    version: s.buildVersion ?? '',
  }
})

const memoryTooltip = computed(() => t('system.info.memoryTooltip', {
  used: formatSize(memory.used), committedFree: formatSize(memory.committedFree), free: formatSize(memory.free), max: formatSize(memory.max),
}))

function formatSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let n = bytes; let i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}
function getCookie(name) {
  for (const part of document.cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}
function round1(n) { return Math.round(n * 10) / 10 }

async function load() {
  error.value = null
  let data
  try { data = await api.get('rest/system') } catch { error.value = t('common.loadError') || 'Load error'; return }
  if (!data) return
  cpu.value = data.cpu?.total ?? ''
  dateIso.value = data.date?.date ? new Date(data.date.date).toISOString() : ''
  dateTimestamp.value = data.date?.date ?? ''
  tz.application = data.date?.timeZone ?? ''
  tz.default = data.date?.defaultTimeZone ?? ''
  tz.original = data.date?.originalDefaultTimeZone ?? ''
  const max = data.memory?.maxMemory || (data.memory?.totalMemory || 0) + 1_000_000
  const committedUsed = (data.memory?.totalMemory ?? 0) - (data.memory?.freeMemory ?? 0)
  const committedFree = data.memory?.freeMemory ?? 0
  const free = Math.max(0, max - (data.memory?.totalMemory ?? 0))
  memory.used = committedUsed; memory.committedFree = committedFree; memory.free = free; memory.max = max
  memory.pctUsed = round1((committedUsed / max) * 100)
  memory.pctCommittedFree = round1((committedFree / max) * 100)
  memory.pctFree = round1(100 - memory.pctUsed - memory.pctCommittedFree)
}

async function saveTimeZone(type, value) {
  if (!value) return
  updatingTz.value = type
  try {
    await fetch(`${APP_BASE}rest/system/timezone/${type}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: value })
  } catch { /* silent — field keeps the user's edit */ } finally { updatingTz.value = null }
}

onMounted(() => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('system.breadcrumb') }, { title: t('system.info.title') }], { refresh: load })
  load()
})
</script>

<style scoped>
.sysinfo {
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
.ph { margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
.crumbs { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.crumb { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font); font-size: 11.5px; font-weight: 700; color: var(--ink-3); background: var(--pill); border-radius: 999px; padding: 3px 10px; }
.crumb.cur { color: var(--accent); background: rgba(var(--v-theme-secondary), .12); }
.csep { color: var(--ink-3); font-size: 12px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }
.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 1100px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
.card { border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 6%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); overflow: hidden; }
.card.hero { grid-column: 1 / -1; }
.card-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px 12px; }
.ch-ic { width: 40px; height: 40px; border-radius: 12px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.card-head h3 { font-family: var(--font); font-weight: 800; font-size: 17px; margin: 0; letter-spacing: -.02em; }
.used-badge { margin-left: auto; display: flex; align-items: baseline; gap: 8px; padding: 6px 14px; border-radius: 12px; background: var(--pill); }
.used-badge b { font-family: var(--mono); font-weight: 700; font-size: 22px; line-height: 1; color: var(--ink); }
.used-badge b small { font-size: 13px; margin-left: 1px; }
.used-badge span { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-3); }
.used-badge.warn { background: rgba(217, 112, 26, .14); } .used-badge.warn b { color: #d9701a; }
.used-badge.err { background: rgba(223, 77, 66, .14); } .used-badge.err b { color: #df4d42; }
.card-body { padding: 4px 18px 18px; }

.mem { margin-bottom: 12px; }
.mem.big { margin-bottom: 16px; }
.mem-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.mem-label { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.mem-val { font-family: var(--mono); font-size: 12.5px; color: var(--ink-3); }
.mem-bar { display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: rgba(29, 157, 99, .25); }
.mem.big .mem-bar { height: 20px; border-radius: 10px; }
.mem-bar .seg { height: 100%; transition: width .5s cubic-bezier(.2, .7, .3, 1); }
.mem-bar .seg.used { background: linear-gradient(90deg, #df4d42, #b3392f); }
.mem-bar .seg.committed { background: linear-gradient(90deg, #d9701a, #e0a106); opacity: .85; }
.mem-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 11.5px; font-weight: 600; color: var(--ink-3); }
.mem-legend span { display: inline-flex; align-items: center; gap: 5px; }
.dot { width: 9px; height: 9px; border-radius: 50%; }
.dot.used { background: #df4d42; }
.dot.committed { background: #d9701a; }
.dot.free { background: #1d9d63; }

.subgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 720px) { .subgrid { grid-template-columns: 1fr; } }
.tile { display: flex; flex-direction: column; gap: 6px; padding: 13px 15px; border-radius: 13px; border: 1px solid var(--border); background: var(--surface); }
.tile-k { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--ink-3); }
.tile-k :deep(.v-icon) { opacity: .7; }
.tile-v { font-family: var(--mono); font-size: 16px; font-weight: 600; color: var(--ink); word-break: break-all; }
.tile-v.sm { font-size: 12.5px; }

.frow { display: flex; align-items: center; gap: 12px; padding: 9px 8px; margin: 0 -8px; border-radius: 9px; border-bottom: 1px solid var(--border); transition: background .14s; }
.frow:hover { background: var(--hover); }
.frow:last-child { border-bottom: 0; }
.fk { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--ink-3); flex: none; min-width: 130px; }
.fk :deep(.v-icon) { opacity: .7; }
.fv { font-size: 13.5px; color: var(--ink); margin-left: auto; text-align: right; display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; min-width: 0; overflow: hidden; }
.fv.mono { font-family: var(--mono); font-size: 12.5px; }
.fv.ellip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vtxt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.copy { border: 0; background: transparent; cursor: pointer; color: var(--ink-3); display: inline-grid; place-items: center; padding: 3px; border-radius: 6px; flex: none; }
.copy:hover { color: var(--accent); background: var(--hover); }

.ifield { display: block; margin-bottom: 12px; }
.ifield:last-child { margin-bottom: 0; }
.if-label { display: block; font-size: 12px; font-weight: 600; color: var(--ink-3); margin-bottom: 5px; }
.if-box { display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 42px; border-radius: 11px; border: 1px solid var(--border); background: var(--surface); transition: border-color .15s; }
.if-box:focus-within { border-color: var(--border-2); }
.if-box.readonly { background: var(--pill); }
.if-ic { color: var(--ink-3); }
.if-box input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-family: var(--mono); font-size: 13px; min-width: 0; }
.mspin.sm { width: 15px; height: 15px; border: 2px solid var(--border-2); border-top-color: var(--accent); border-radius: 50%; animation: sspin .7s linear infinite; flex: none; }
@keyframes sspin { to { transform: rotate(360deg); } }
</style>
