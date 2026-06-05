<!--
  AboutView — 2026 "Vibrant" about page (/about). Ports the core AboutView
  content (app build info from auth.appSettings, frontend stack, project links,
  resources) into the Vibrant card grid. Reached from the sidebar footer.
-->
<template>
  <div class="about lj-surface">
    <LjPageHeader
      :title="t('about.title', { name: appName })"
      :subtitle="t('about.subtitle')"
      :crumbs="[{ icon: 'mdi-information-outline', label: t('about.title', { name: appName }), current: true }]"
    />

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
          <a class="lrow" @click="licenseDialog = true">
            <v-icon size="20" class="lr-ic">mdi-license</v-icon>
            <span class="lr-txt"><span class="lr-title">{{ t('about.license') }}</span><span class="lr-sub">MIT</span></span>
            <v-icon size="16" class="lr-go">mdi-chevron-right</v-icon>
          </a>
          <a class="lrow" href="https://www.kloudy.fr/" target="_blank" rel="noopener noreferrer">
            <v-icon size="20" class="lr-ic">mdi-hammer-wrench</v-icon>
            <span class="lr-txt">
              <span class="lr-title">{{ t('about.builtBy') }}</span>
              <span class="lr-sub d-flex align-center ga-2">
                <span class="kloudy-name">Kloudy</span>
                <img :src="brandColor" alt="Kloudy" class="kloudy-logo" />
              </span>
            </span>
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

    <v-dialog v-model="licenseDialog" max-width="680" scrollable>
      <div class="lic" :style="{ '--c': '#8b5cf6' }">
        <header class="lic-head">
          <span class="lic-orb"><v-icon size="20">mdi-license</v-icon></span>
          <div class="lic-htxt">
            <h3>{{ t('about.license') }} — MIT</h3>
            <p>Ligoj</p>
          </div>
          <button class="lic-x" :aria-label="t('common.close')" @click="licenseDialog = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </header>
        <div class="lic-body"><pre class="ligoj-license">{{ licenseText }}</pre></div>
        <footer class="lic-foot">
          <button class="lic-btn" @click="licenseDialog = false">{{ t('common.close') }}</button>
        </footer>
      </div>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore, useAuthStore, useI18nStore, LjPageHeader } from '@ligoj/host'
import brandColor from '@/assets/brand.png'

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

const licenseDialog = ref(false)

// Inlined MIT license text — kept here so the About view does not have
// to fetch the LICENSE file from the backend (works offline / in dev).
const LICENSE_TEMPLATE = (name) => `MIT License

Copyright (c) ${name} Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

const licenseText = computed(() => LICENSE_TEMPLATE(appName.value))

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
  --font: var(--lj-font, var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif));
  --mono: var(--lj-mono, var(--v26-mono, "JetBrains Mono", ui-monospace, monospace));
  /* Shape/type from the active style's design tokens (assets/vuetify-overrides.css)
   * so this hand-rolled view re-shapes with the theme, not just recolors.
   * Fallbacks keep the original look when no style attribute is set. */
  --radius: var(--lj-radius, 18px);
  --radius-sm: var(--lj-radius-sm, 12px);
  --shadow: var(--lj-shadow, 0 2px 8px rgba(0, 0, 0, .04));
  --border-w: var(--lj-border-width, 1px);
  --border-c: var(--lj-border-color, var(--border));
  --bold: var(--lj-weight-bold, 800);
  color: var(--ink);
}
/* Page header now rendered by the shared <LjPageHeader> (host). */

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.card { border: var(--border-w) var(--lj-border-style, solid) var(--border-c); border-radius: var(--radius); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 6%, var(--card)), var(--card)); box-shadow: var(--shadow); overflow: hidden; transition: transform .16s, box-shadow .16s, border-color .16s; }
.card:hover { transform: translateY(-3px); box-shadow: 0 22px 44px -22px color-mix(in srgb, var(--c) 55%, transparent); border-color: color-mix(in srgb, var(--c) 35%, var(--border)); }
@media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }
.card-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px 10px; }
.ch-ic { width: 40px; height: 40px; border-radius: var(--radius-sm); flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.card-head h3 { font-family: var(--font); font-weight: var(--bold); font-size: 17px; margin: 0; letter-spacing: -.02em; }
.card-body { padding: 2px 18px 16px; }

.frow { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.frow:last-child { border-bottom: 0; }
.fk { font-size: 13px; font-weight: 600; color: var(--ink-3); flex: none; }
.fv { font-size: 13.5px; color: var(--ink); margin-left: auto; text-align: right; min-width: 0; overflow: hidden; }
.fv.mono { font-family: var(--mono); font-size: 12.5px; }
.vtxt { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }

.lrow { display: flex; align-items: center; gap: 12px; padding: 11px 10px; margin: 0 -10px; border-radius: var(--lj-radius-sm, 11px); cursor: pointer; text-decoration: none; color: inherit; transition: background .14s; }
.lrow:hover { background: var(--hover); }
.lrow.static { cursor: default; }
.lrow.static:hover { background: transparent; }
.lr-ic { color: var(--ink-2); flex: none; }
.lr-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.lr-title { font-family: var(--font); font-weight: 700; font-size: 13.5px; color: var(--ink); }
.lr-sub { font-size: 12px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lr-go { color: var(--ink-3); flex: none; }
.kloudy-name { font-weight: 800; color: #d9701a; }
.kloudy-logo {
  height: 1.1em;
  width: auto;
  vertical-align: middle;
}
/* License dialog — reskinned to match the Vibrant card language */
.lic {
  --surface: rgb(var(--v-theme-surface));
  --card: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --font: var(--lj-font, var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif));
  --mono: var(--lj-mono, var(--v26-mono, "JetBrains Mono", ui-monospace, monospace));
  --radius: var(--lj-radius, 18px);
  --radius-sm: var(--lj-radius-sm, 12px);
  --shadow-lg: var(--lj-shadow-lg, 0 32px 64px -24px color-mix(in srgb, var(--c) 45%, transparent));
  --border-w: var(--lj-border-width, 1px);
  --border-c: var(--lj-border-color, var(--border));
  --bold: var(--lj-weight-bold, 800);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  max-height: 82vh;
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  border-radius: var(--radius);
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 6%, var(--card)), var(--card));
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.lic-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
.lic-orb { width: 40px; height: 40px; border-radius: var(--radius-sm); flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.lic-htxt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.lic-htxt h3 { font-family: var(--font); font-weight: var(--bold); font-size: 17px; margin: 0; letter-spacing: -.02em; }
.lic-htxt p { margin: 1px 0 0; font-size: 12px; color: var(--ink-3); font-weight: 600; }
.lic-x { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border: 0; border-radius: var(--lj-radius-sm, 10px); background: transparent; color: var(--ink-3); cursor: pointer; transition: background .14s, color .14s; }
.lic-x:hover { background: var(--hover); color: var(--ink); }
.lic-body { padding: 16px 18px; overflow-y: auto; }
.lic-foot { display: flex; justify-content: flex-end; padding: 12px 18px; border-top: 1px solid var(--border); }
.lic-btn { font-family: var(--font); font-weight: 700; font-size: 13px; color: var(--ink); padding: 8px 16px; border: var(--border-w) var(--lj-border-style, solid) var(--border-c); border-radius: var(--lj-radius-sm, 10px); background: transparent; cursor: pointer; transition: background .14s, border-color .14s; }
.lic-btn:hover { background: var(--hover); border-color: color-mix(in srgb, var(--c) 35%, var(--border)); }
.ligoj-license {
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
</style>
