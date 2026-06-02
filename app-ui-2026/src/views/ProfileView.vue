<!--
  Profil — version UI 2026. Réutilise les stores/plugins du core (auth,
  i18n, presets, styles) via l'alias `@`. Aucune dépendance au shell-font
  hack : l'app 2026 applique sa police globalement.
-->
<template>
  <div class="p2026">
    <header class="hero">
      <div class="hero-avatar">{{ initials }}</div>
      <div class="hero-id">
        <h1>{{ auth.userName || 'invité' }}</h1>
        <p>{{ t('profile.title') }}</p>
        <div class="hero-roles"><span v-for="role in auth.roles" :key="role" class="rolechip">{{ role }}</span></div>
      </div>
    </header>

    <div class="p-grid">
      <section class="pcard">
        <h3><span class="ic"><v-icon>mdi-account</v-icon></span>{{ t('profile.account') }}</h3>
        <div class="infoline"><span class="k">{{ t('profile.username') }}</span><span class="v mono">{{ auth.userName }}</span></div>
        <a class="infoline link" href="#/api/token">
          <span class="k">{{ t('profile.apiTokens') }}</span>
          <span class="v">{{ t('profile.apiTokensHint') }}<v-icon size="small">mdi-chevron-right</v-icon></span>
        </a>
      </section>

      <section class="pcard">
        <h3><span class="ic"><v-icon>mdi-key</v-icon></span>{{ t('profile.permissions') }}</h3>
        <div class="subhead">{{ t('profile.uiAuth', { count: auth.uiAuthorizations.length }) }}</div>
        <div class="perm-list">
          <code v-for="(pattern, i) in auth.uiAuthorizations" :key="'ui-' + i" class="perm">{{ pattern }}</code>
        </div>
      </section>

      <section class="pcard pcard--full">
        <h3><span class="ic"><v-icon>mdi-tune</v-icon></span>{{ t('profile.preferences') }}</h3>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-translate</v-icon>
          <div class="pt"><div class="ptt">{{ t('profile.language') }}</div></div>
          <div class="langsel" :class="{ open: langOpen }">
            <button type="button" class="langsel-btn" @click="langOpen = !langOpen">
              <span class="flag">{{ FLAGS[i18n.locale] || '🌐' }}</span>
              <span>{{ currentLang.title }}</span>
              <v-icon size="small" class="caret">mdi-chevron-down</v-icon>
            </button>
            <div v-if="langOpen" class="langsel-menu">
              <button v-for="opt in languageItems" :key="opt.value" type="button" class="langsel-opt" :class="{ sel: opt.value === i18n.locale }" @click="pickLang(opt.value)">
                <span class="flag">{{ FLAGS[opt.value] || '🌐' }}</span><span>{{ opt.title }}</span>
                <v-icon v-if="opt.value === i18n.locale" size="small" class="ok">mdi-check</v-icon>
              </button>
            </div>
          </div>
        </div>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-bell-off-outline</v-icon>
          <div class="pt"><div class="ptt">{{ t('profile.skipUnsavedConfirmation') }}</div><div class="pth">{{ t('profile.skipUnsavedConfirmationHint') }}</div></div>
          <span class="sw" :class="{ on: skipUnsavedConfirmation }" role="switch" :aria-checked="skipUnsavedConfirmation" @click="onSkipUnsavedChange(!skipUnsavedConfirmation)"></span>
        </div>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-format-line-spacing</v-icon>
          <div class="pt"><div class="ptt">{{ t('profile.compact') }}</div><div class="pth">{{ t('profile.compactHint') }}</div></div>
          <span class="sw" :class="{ on: compact }" role="switch" :aria-checked="compact" @click="onCompactChange(!compact)"></span>
        </div>

        <div class="pref-theme-label"><v-icon class="pref-ic">mdi-palette</v-icon>{{ t('profile.theme') }}</div>
        <div class="tiles">
          <div v-for="opt in PRESET_OPTIONS" :key="opt.id" class="tile" :class="{ on: preset === opt.id }" @click="choosePreset(opt.id)">
            <div class="sw-strip"><span v-for="(c, i) in opt.swatch" :key="i" :style="{ background: c }" /></div>
            <div class="tile-b">
              <div class="tile-h">
                <span class="moon">{{ opt.dark ? '🌙' : '☀️' }}</span>
                <span class="tile-name">{{ opt.label }}</span>
                <v-icon v-if="preset === opt.id" size="small" class="tile-check">mdi-check-circle</v-icon>
              </div>
              <div class="tile-desc">{{ opt.description }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'
import { PRESET_OPTIONS, detectPreset, applyPreset, persistPreset } from '@/plugins/presets.js'
import { detectCompact, applyCompact, persistCompact } from '@/plugins/styles.js'

const auth = useAuthStore()
const i18n = useI18nStore()
const theme = useTheme()
const t = i18n.t

const initials = computed(() => (auth.userName || '?').slice(0, 2).toUpperCase())

const preset = ref(detectPreset().id)
function choosePreset(id) { preset.value = id; applyPreset(id, theme); persistPreset(id) }

const compact = ref(detectCompact())
function onCompactChange(value) { compact.value = !!value; applyCompact(compact.value); persistCompact(compact.value) }

const LOCALE_LABELS = { en: 'English', fr: 'Français' }
const FLAGS = { en: '🇬🇧', fr: '🇫🇷' }
const languageItems = computed(() =>
  i18n.SUPPORTED_LOCALES.map((value) => ({ value, title: LOCALE_LABELS[value] || value })),
)
const currentLang = computed(() => languageItems.value.find((o) => o.value === i18n.locale) || { value: i18n.locale, title: i18n.locale })
const langOpen = ref(false)
function pickLang(v) { i18n.setLocale(v); langOpen.value = false }
function onDocClick(e) { if (!e.target.closest('.langsel')) langOpen.value = false }

const STORAGE_KEY = 'ligoj.skipUnsavedConfirmation'
const skipUnsavedConfirmation = ref(
  typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY) === 'true'
)
function onSkipUnsavedChange(value) {
  skipUnsavedConfirmation.value = !!value
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  }
}

onMounted(() => { if (typeof document !== 'undefined') document.addEventListener('click', onDocClick) })
onBeforeUnmount(() => { if (typeof document !== 'undefined') document.removeEventListener('click', onDocClick) })
</script>

<style scoped>
.p2026 {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --muted: rgba(var(--v-theme-on-surface), .60);
  --line: rgba(var(--v-theme-on-surface), .12);
  --pill: rgba(var(--v-theme-on-surface), .05);
  --hover: rgba(var(--v-theme-on-surface), .07);
  --primary: rgb(var(--v-theme-primary));
  --on-primary: rgb(var(--v-theme-on-primary));
  --ok: #1d9d63;
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: "JetBrains Mono", ui-monospace, monospace;
  color: var(--ink);
}
.mono { font-family: var(--mono); }

.hero { display: flex; align-items: center; gap: 18px; padding: 24px 26px; margin-bottom: 20px; border-radius: 22px; color: var(--on-primary);
  background: radial-gradient(600px 200px at 100% -40%, rgba(255,255,255,.18), transparent 70%), linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000));
  box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--primary) 80%, transparent); }
.hero-avatar { width: 64px; height: 64px; flex: none; border-radius: 20px; display: grid; place-items: center; font-family: var(--mono); font-weight: 700; font-size: 22px; background: rgba(255,255,255,.18); box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); }
.hero-id h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.03em; font-size: 28px; margin: 0; line-height: 1.05; }
.hero-id p { margin: 3px 0 9px; font-size: 14px; opacity: .85; font-weight: 500; }
.hero-roles { display: flex; flex-wrap: wrap; gap: 6px; }
.rolechip { font-size: 11.5px; font-weight: 700; letter-spacing: .02em; padding: 3px 10px; border-radius: 20px; background: rgba(255,255,255,.2); color: var(--on-primary); }

.p-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.pcard--full { grid-column: 1 / -1; }
@media (max-width: 960px) { .p-grid { grid-template-columns: 1fr; } }

.pcard { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 10px 28px -22px rgba(0,0,0,.5); }
.pcard h3 { font-family: var(--font); font-weight: 800; font-size: 18px; margin: 0 0 16px; display: flex; align-items: center; gap: 10px; color: var(--ink); }
.pcard h3 .ic { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: color-mix(in srgb, var(--primary) 16%, transparent); color: var(--primary); }

.infoline { display: flex; align-items: center; gap: 12px; padding: 12px 0; text-decoration: none; }
.infoline + .infoline { border-top: 1px solid var(--line); }
.infoline .k { font-size: 13px; color: var(--muted); font-weight: 600; width: 130px; flex: none; }
.infoline .v { font-weight: 600; font-size: 14px; color: var(--ink); display: inline-flex; align-items: center; gap: 4px; }
.infoline.link .v { color: var(--primary); cursor: pointer; }

.subhead { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 10px; }
.perm-list { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow: auto; }
.perm { font-family: var(--mono); font-size: 12px; color: var(--muted); background: var(--pill); border: 1px solid var(--line); border-radius: 8px; padding: 5px 10px; }

.pref-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; }
.pref-row + .pref-row, .pref-theme-label { border-top: 1px solid var(--line); }
.pref-ic { color: var(--muted); }
.pref-row .pt { flex: 1; } .ptt { font-weight: 700; font-size: 14px; color: var(--ink); } .pth { font-size: 12.5px; color: var(--muted); margin-top: 2px; }

.langsel { position: relative; min-width: 210px; }
.langsel-btn { width: 100%; display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 11px; border: 1px solid var(--line); background: var(--pill); color: var(--ink); font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; transition: border-color .15s; }
.langsel-btn:hover { border-color: var(--primary); }
.langsel-btn .flag { font-size: 17px; line-height: 1; }
.langsel-btn .caret { margin-left: auto; color: var(--muted); transition: transform .2s; }
.langsel.open .langsel-btn .caret { transform: rotate(180deg); }
.langsel-menu { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 20; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 18px 44px -18px rgba(0,0,0,.5); padding: 6px; animation: langmenu .13s ease; }
@keyframes langmenu { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.langsel-opt { width: 100%; display: flex; align-items: center; gap: 9px; padding: 9px 11px; border: 0; background: transparent; border-radius: 8px; color: var(--ink); font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; text-align: left; }
.langsel-opt:hover { background: var(--hover); }
.langsel-opt.sel { color: var(--primary); }
.langsel-opt .flag { font-size: 17px; line-height: 1; }
.langsel-opt .ok { margin-left: auto; color: var(--primary); }

.sw { width: 46px; height: 26px; border-radius: 20px; background: var(--line); position: relative; cursor: pointer; transition: background .2s; flex: none; }
.sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: left .2s; }
.sw.on { background: var(--ok); } .sw.on::after { left: 23px; }

.pref-theme-label { font-weight: 700; font-size: 14px; color: var(--ink); display: flex; align-items: center; gap: 8px; padding: 16px 0 12px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(152px, 1fr)); gap: 10px; }
.tile { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform .15s, box-shadow .15s, border-color .15s; background: var(--surface); }
.tile:hover { transform: translateY(-2px); box-shadow: 0 10px 22px -12px rgba(0,0,0,.5); }
.tile.on { border-color: var(--primary); border-width: 2px; }
.sw-strip { display: flex; height: 32px; } .sw-strip span { flex: 1; }
.tile-b { padding: 7px 10px 9px; }
.tile-h { display: flex; align-items: center; gap: 6px; }
.tile-name { font-size: 12.5px; font-weight: 700; color: var(--ink); }
.tile-check { margin-left: auto; color: var(--primary); }
.tile-desc { font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
