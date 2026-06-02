<!--
  AboutView — 2026 "Vibrant" about page (/about). Ports the core AboutView
  content (app build info from auth.appSettings, frontend stack, project links,
  resources) into the Vibrant card grid. Reached from the sidebar footer.
-->
<template>
  <div class="about">
    <header class="ph">
      <div class="ph-txt">
        <nav class="crumbs"><span class="crumb cur"><v-icon size="13">mdi-information-outline</v-icon>{{ t('about.title', { name: appName }) }}</span></nav>
        <h1>{{ t('about.title', { name: appName }) }}</h1>
        <p class="sub">{{ t('about.subtitle') }}</p>
      </div>
    </header>

    <div class="grid">
      <section class="card" :style="{ '--c': '#2f6df6' }">
        <div class="card-head"><span class="ch-ic"><v-icon size="20">mdi-information</v-icon></span><h3>{{ t('about.app') }}</h3></div>
        <div class="card-body">
          <div class="frow"><span class="fk">{{ t('about.version') }}</span><span class="fv mono">{{ build.version }}</span></div>
          <div class="frow"><span class="fk">{{ t('about.buildDate') }}</span><span class="fv mono">{{ build.date }}</span></div>
          <div class="frow"><span class="fk">{{ t('about.buildNumber') }}</span><span class="fv mono"><span class="vtxt" :title="build.number">{{ build.number }}</span></span></div>
        </div>
      </section>

      <section class="card" :style="{ '--c': '#1d9d63' }">
        <div class="card-head"><span class="ch-ic"><v-icon size="20">mdi-monitor-dashboard</v-icon></span><h3>{{ t('about.frontend') }}</h3></div>
        <div class="card-body">
          <div class="frow"><span class="fk">{{ t('about.framework') }}</span><span class="fv">Vue 3 + Vuetify 4</span></div>
          <div class="frow"><span class="fk">{{ t('about.buildTool') }}</span><span class="fv">Vite 8</span></div>
          <div class="frow"><span class="fk">{{ t('about.state') }}</span><span class="fv">Pinia 3</span></div>
        </div>
      </section>

      <section class="card" :style="{ '--c': '#8b5cf6' }">
        <div class="card-head"><span class="ch-ic"><v-icon size="20">mdi-source-branch</v-icon></span><h3>{{ t('about.project') }}</h3></div>
        <div class="card-body">
          <a class="lrow" href="https://github.com/ligoj/ligoj" target="_blank" rel="noopener noreferrer">
            <v-icon size="20" class="lr-ic">mdi-github</v-icon>
            <span class="lr-txt"><span class="lr-title">{{ t('about.github') }}</span><span class="lr-sub">github.com/ligoj/ligoj</span></span>
            <v-icon size="16" class="lr-go">mdi-open-in-new</v-icon>
          </a>
          <div class="lrow static">
            <v-icon size="20" class="lr-ic">mdi-license</v-icon>
            <span class="lr-txt"><span class="lr-title">{{ t('about.license') }}</span><span class="lr-sub">MIT</span></span>
          </div>
          <a class="lrow" href="https://www.kloudy.fr/" target="_blank" rel="noopener noreferrer">
            <v-icon size="20" class="lr-ic">mdi-hammer-wrench</v-icon>
            <span class="lr-txt"><span class="lr-title">{{ t('about.builtBy') }}</span><span class="lr-sub">Kloudy</span></span>
            <v-icon size="16" class="lr-go">mdi-open-in-new</v-icon>
          </a>
        </div>
      </section>

      <section class="card" :style="{ '--c': '#d9701a' }">
        <div class="card-head"><span class="ch-ic"><v-icon size="20">mdi-bookshelf</v-icon></span><h3>{{ t('about.resources') }}</h3></div>
        <div class="card-body">
          <a class="lrow" @click="go('/api')">
            <v-icon size="20" class="lr-ic">mdi-api</v-icon>
            <span class="lr-txt"><span class="lr-title">{{ t('about.api') }}</span><span class="lr-sub">{{ t('about.apiHint') }}</span></span>
            <v-icon size="16" class="lr-go">mdi-chevron-right</v-icon>
          </a>
          <a class="lrow" @click="go('/system/information')">
            <v-icon size="20" class="lr-ic">mdi-server-outline</v-icon>
            <span class="lr-txt"><span class="lr-title">{{ t('system.info.title') }}</span><span class="lr-sub">{{ t('system.info.subtitle') }}</span></span>
            <v-icon size="16" class="lr-go">mdi-chevron-right</v-icon>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore, useAuthStore, useI18nStore } from '@ligoj/host'

const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
const i18n = useI18nStore()
const t = i18n.t

const appName = computed(() => auth.appSettings?.name || 'Ligoj')
const build = computed(() => {
  const s = auth.appSettings || {}
  const ts = parseInt(s.buildTimestamp, 10)
  return {
    version: s.buildVersion || '—',
    number: s.buildNumber || '—',
    date: Number.isNaN(ts) ? '—' : new Date(ts).toISOString().slice(0, 10),
  }
})
function go(path) { router.push(path) }

onMounted(() => app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('about.title', { name: appName.value }) }]))
</script>

<style scoped>
.about {
  --surface: rgb(var(--v-theme-surface));
  --card: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace);
  color: var(--ink);
}
.ph { margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
.crumbs { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.crumb { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font); font-size: 11.5px; font-weight: 700; color: var(--accent); background: rgba(var(--v-theme-secondary), .12); border-radius: 999px; padding: 3px 10px; }
.ph-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; }
.ph-txt .sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); font-weight: 500; }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.card { border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 6%, var(--card)), var(--card)); box-shadow: 0 2px 8px rgba(0, 0, 0, .04); overflow: hidden; }
.card-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px 10px; }
.ch-ic { width: 40px; height: 40px; border-radius: 12px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.card-head h3 { font-family: var(--font); font-weight: 800; font-size: 17px; margin: 0; letter-spacing: -.02em; }
.card-body { padding: 2px 18px 16px; }

.frow { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.frow:last-child { border-bottom: 0; }
.fk { font-size: 13px; font-weight: 600; color: var(--ink-3); flex: none; }
.fv { font-size: 13.5px; color: var(--ink); margin-left: auto; text-align: right; min-width: 0; overflow: hidden; }
.fv.mono { font-family: var(--mono); font-size: 12.5px; }
.vtxt { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }

.lrow { display: flex; align-items: center; gap: 12px; padding: 11px 10px; margin: 0 -10px; border-radius: 11px; cursor: pointer; text-decoration: none; color: inherit; transition: background .14s; }
.lrow:hover { background: var(--hover); }
.lrow.static { cursor: default; }
.lrow.static:hover { background: transparent; }
.lr-ic { color: var(--ink-2); flex: none; }
.lr-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.lr-title { font-family: var(--font); font-weight: 700; font-size: 13.5px; color: var(--ink); }
.lr-sub { font-size: 12px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lr-go { color: var(--ink-3); flex: none; }
</style>
