<!--
  SystemBenchView — 2026 "Vibrant" database benchmark tool
  (Administration → Bench). Ports plugin-ui's SystemBenchView logic (runs
  INSERT → SELECT → SELECT * → UPDATE → DELETE against rest/system/bench/* and
  reports each step's duration; the INSERT step needs a multipart FormData
  body to satisfy the server's @Consumes constraint) onto the Vibrant chrome:
  breadcrumb-chip header, an explainer + control panel (custom number input +
  Run CTA + total badge) and a results panel with per-step proportion bars.
-->
<template>
  <div class="bench">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb"><v-icon size="13">mdi-cog-outline</v-icon>{{ t('system.breadcrumb') }}</span><span class="csep">›</span><span class="crumb cur">{{ t('system.bench.title') }}</span></nav>
        <h1>{{ t('system.bench.heading') }}</h1>
        <p class="sub">{{ t('system.bench.subtitle') }}</p>
      </div>
      <div v-if="totalDuration != null" class="total-badge">
        <span class="tb-label">{{ t('system.bench.total') }}</span>
        <span class="tb-num">{{ totalDuration }}<small>{{ t('system.bench.ms') }}</small></span>
      </div>
    </header>

    <div class="panel-card help">
      <span class="help-ic"><v-icon size="20">mdi-database-clock-outline</v-icon></span>
      <p>{{ t('system.bench.help') }}</p>
    </div>

    <div class="ctrl">
      <div class="numfield">
        <v-icon size="17" class="nf-ic">mdi-counter</v-icon>
        <input v-model.number="nb" type="number" min="1" :aria-label="t('system.bench.fieldNb')" />
      </div>
      <button class="btn" :disabled="running" @click="run">
        <span v-if="running" class="mspin" aria-hidden="true" /><v-icon v-else size="18">mdi-play</v-icon>{{ t('system.bench.run') }}
      </button>
    </div>

    <p v-if="error" class="errline"><v-icon size="16">mdi-alert-outline</v-icon>{{ error }}</p>

    <div class="panel-card steps">
      <div v-for="(r, i) in results" :key="r.step" class="step" :style="{ animationDelay: (i * 60) + 'ms' }">
        <span class="st-badge" :class="{ done: typeof r.duration === 'number', running: r.loading }">{{ i + 1 }}</span>
        <span class="st-name">{{ r.step }}</span>
        <div class="st-bar"><i :style="{ width: barWidth(r) + '%' }" :class="{ idle: r.duration == null }" /></div>
        <span class="st-dur">
          <span v-if="r.loading" class="mspin sm" aria-hidden="true" />
          <template v-else-if="typeof r.duration === 'number'">{{ r.duration }}<small>{{ t('system.bench.ms') }}</small></template>
          <template v-else>{{ r.duration ?? '—' }}</template>
        </span>
      </div>
      <p v-if="!hasRun" class="idle-hint">{{ t('system.bench.idle') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi, useAppStore, useI18nStore, APP_BASE } from '@ligoj/host'

const api = useApi()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const nb = ref(1000)

// `prepare` is @Consumes(FORM_URLENCODED, MULTIPART) / @Produces(TEXT_HTML), so
// posting via useApi (empty body, no Content-Type) returns 415. Send FormData —
// fetch sets the multipart boundary — and parse the text response. The other
// four steps are well-behaved JSON endpoints and go through useApi.
const STEPS = [
  { key: 'insert', step: 'INSERT', form: true, url: 'rest/system/bench/prepare' },
  { key: 'select', step: 'SELECT', method: 'get', url: 'rest/system/bench/read' },
  { key: 'select-all', step: 'SELECT *', method: 'get', url: 'rest/system/bench/read/all' },
  { key: 'update', step: 'UPDATE', method: 'put', url: 'rest/system/bench/update' },
  { key: 'delete', step: 'DELETE', method: 'del', url: 'rest/system/bench/delete' },
]

const running = ref(false)
const hasRun = ref(false)
const error = ref(null)
const results = ref(STEPS.map((s) => ({ step: s.step, duration: null, loading: false })))

const totalDuration = computed(() => {
  const nums = results.value.map((r) => r.duration).filter((d) => typeof d === 'number')
  return nums.length === STEPS.length ? nums.reduce((s, d) => s + d, 0) : null
})
const maxDuration = computed(() => Math.max(1, ...results.value.map((r) => (typeof r.duration === 'number' ? r.duration : 0))))
function barWidth(r) { return typeof r.duration === 'number' ? Math.max(3, Math.round(r.duration / maxDuration.value * 100)) : 0 }

async function runStep(step) {
  if (step.form) {
    const form = new FormData()
    form.append('nb', nb.value || 1000)
    const resp = await fetch(`${APP_BASE}${step.url}`, { method: 'POST', credentials: 'include', body: form })
    if (!resp.ok) throw new Error(`${step.step} HTTP ${resp.status}`)
    const text = (await resp.text()).trim()
    if (!text) return { duration: '' }
    try { return JSON.parse(text) } catch { /* fall through */ }
    const n = Number(text)
    return { duration: Number.isFinite(n) ? n : text }
  }
  return api[step.method](step.url)
}

async function run() {
  running.value = true; hasRun.value = true; error.value = null
  results.value = STEPS.map((s) => ({ step: s.step, duration: null, loading: false }))
  for (let i = 0; i < STEPS.length; i++) {
    results.value[i].loading = true
    try {
      const data = await runStep(STEPS[i])
      results.value[i].duration = data?.duration ?? '—'
    } catch (e) {
      error.value = `${STEPS[i].step} failed: ${e.message || e}`
      break
    } finally {
      results.value[i].loading = false
    }
  }
  running.value = false
}

onMounted(() => {
  app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('system.breadcrumb') }, { title: t('system.bench.title') }])
})
</script>

<style scoped>
.bench {
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
.total-badge { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; padding: 10px 18px; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); background: linear-gradient(135deg, rgba(var(--v-theme-secondary), .1), var(--card)); }
.tb-label { font-family: var(--font); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); }
.tb-num { font-family: var(--mono); font-weight: 700; font-size: 24px; line-height: 1; color: var(--accent); }
.tb-num small { font-size: 13px; margin-left: 2px; }

.panel-card { border: 1px solid var(--border); border-radius: 16px; background: var(--card); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); margin-bottom: 16px; }
.help { display: flex; align-items: center; gap: 14px; padding: 16px 18px; }
.help-ic { width: 42px; height: 42px; border-radius: 12px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #2f6df6, #1e40af); box-shadow: 0 8px 18px -8px rgba(47, 109, 246, .55); }
.help p { margin: 0; font-size: 13.5px; color: var(--ink-2); font-weight: 500; line-height: 1.5; }

.ctrl { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.numfield { display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; height: 46px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); width: 180px; transition: border-color .15s; }
.numfield:focus-within { border-color: var(--border-2); }
.nf-ic { color: var(--ink-3); }
.numfield input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font-family: var(--mono); font-size: 15px; font-weight: 600; min-width: 0; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 0 20px; height: 46px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); transition: filter .15s; }
.btn:hover:not(:disabled) { filter: brightness(1.04); }
.btn:disabled { opacity: .65; cursor: default; }

.errline { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-error)); margin: 0 0 14px; }

.steps { padding: 8px 18px; max-width: 720px; }
.step { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border); animation: rowin .34s cubic-bezier(.2, .7, .3, 1) both; }
@keyframes rowin { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .step { animation: none; } }
.step:last-of-type { border-bottom: 0; }
.st-badge { width: 26px; height: 26px; border-radius: 8px; flex: none; display: grid; place-items: center; font-family: var(--mono); font-weight: 700; font-size: 12px; color: var(--ink-3); background: var(--pill); transition: background .2s, color .2s; }
.st-badge.done { color: #fff; background: linear-gradient(135deg, #1d9d63, #15784b); }
.st-badge.running { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); }
.st-name { font-family: var(--mono); font-weight: 600; font-size: 13.5px; color: var(--ink); width: 90px; flex: none; }
.st-bar { flex: 1; height: 8px; border-radius: 5px; background: var(--pill); overflow: hidden; }
.st-bar i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, white)); transition: width .5s cubic-bezier(.2, .7, .3, 1); }
.st-bar i.idle { width: 0; }
.st-dur { font-family: var(--mono); font-weight: 700; font-size: 14px; color: var(--ink-2); min-width: 70px; text-align: right; display: inline-flex; justify-content: flex-end; align-items: center; }
.st-dur small { font-size: 11px; color: var(--ink-3); margin-left: 2px; }
.idle-hint { margin: 0; padding: 14px 0 6px; font-size: 13px; color: var(--ink-3); font-weight: 500; text-align: center; }

.mspin { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: sspin .7s linear infinite; }
.mspin.sm { width: 14px; height: 14px; border-color: var(--border-2); border-top-color: var(--accent); }
@keyframes sspin { to { transform: rotate(360deg); } }
</style>
