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
          <button v-for="opt in PRESET_OPTIONS" :key="opt.id" type="button" class="tile" :class="{ on: preset === opt.id }" @click="choosePreset(opt.id)">
            <!-- Rich colour field built from the preset palette (canvas →
                 primary → accent), with the exact swatch as three dots. -->
            <div class="tile-band" :style="{ background: bandBg(opt) }">
              <span class="band-dots"><i v-for="(c, i) in opt.swatch" :key="i" :style="{ background: c }" /></span>
              <span v-if="preset === opt.id" class="band-check"><v-icon size="14">mdi-check</v-icon></span>
            </div>
            <div class="tile-b">
              <div class="tile-h">
                <span class="tile-name">{{ opt.label }}</span>
                <span class="tile-mode" :class="{ dark: opt.dark }"><v-icon size="11">{{ opt.dark ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}</v-icon>{{ opt.dark ? t('profile.themeDark') : t('profile.themeLight') }}</span>
              </div>
              <div class="tile-desc">{{ opt.description }}</div>
            </div>
          </button>
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

// Build a rich colour field for a preset tile from its swatch
// [primary, accent, canvas]. Solid swatches blend canvas → primary → accent
// for a smooth diagonal field; presets whose swatch already carries a CSS
// gradient (Argon / Aurora) use that gradient directly.
function bandBg(opt) {
  const s = (opt.swatch || []).map((c) => c || '#888')
  const grad = s.find((c) => String(c).includes('gradient'))
  if (grad) return grad
  return `linear-gradient(135deg, ${s[2]} 0%, ${s[0]} 58%, ${s[1] || s[0]} 100%)`
}

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
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(184px, 1fr)); gap: 14px; }
.tile { position: relative; text-align: left; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; cursor: pointer; padding: 0; background: var(--surface); box-shadow: 0 2px 8px rgba(0,0,0,.05); transition: transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s, border-color .18s; }
.tile:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -18px rgba(0,0,0,.45); border-color: var(--border-2, rgba(var(--v-theme-on-surface),.26)); }
.tile.on { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary), 0 16px 32px -18px rgba(0,0,0,.5); }
.tile:focus-visible { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), .4); }

/* Rich colour-field band (the theme palette as a smooth gradient). */
.tile-band { position: relative; height: 86px; box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(0,0,0,.06); }
/* a soft top-left sheen for depth */
.tile-band::before { content: ""; position: absolute; inset: 0; background: radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,.28), transparent 55%); }
.band-dots { position: absolute; left: 11px; bottom: 10px; display: flex; gap: 5px; }
.band-dots i { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 1.5px rgba(255,255,255,.65), 0 1px 3px rgba(0,0,0,.3); }
.band-check { position: absolute; top: 9px; right: 9px; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; color: var(--primary); background: #fff; box-shadow: 0 3px 10px -2px rgba(0,0,0,.45); z-index: 2; }

.tile-b { padding: 11px 13px 13px; border-top: 1px solid var(--line); }
.tile-h { display: flex; align-items: center; gap: 8px; }
.tile-name { font-family: var(--font); font-size: 13.5px; font-weight: 800; letter-spacing: -.01em; color: var(--ink); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tile-mode { display: inline-flex; align-items: center; gap: 3px; flex: none; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #d9701a; background: rgba(217,112,26,.13); padding: 2px 7px; border-radius: 999px; }
.tile-mode.dark { color: #8b5cf6; background: rgba(139,92,246,.15); }
.tile-desc { font-size: 11.5px; color: var(--muted); margin-top: 5px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
