<!--
  ProfileView2026 — 2026 "Vibrant" re-skin of the profile page.

  Part of the UI 2026 redesign (feature/ui-2026). The <script setup> is
  DUPLICATED verbatim from ProfileView.vue, so behaviour is identical
  (preset picker, compact toggle, skip-unsaved-confirmation, language) —
  it reuses the same stores and plugins. Only the presentation is
  reworked to the Vibrant design (scoped CSS, self-contained palette so
  it doesn't depend on the active Vuetify theme).

  Reachable at /next/profile while the original /profile (ProfileView.vue)
  stays untouched and remains the default.
-->
<template>
  <div class="p2026">
    <h1 class="p-title">{{ t('profile.title') }}</h1>

    <div class="p-grid">
      <!-- Account -->
      <section class="pcard">
        <h3><span class="ic"><img :src="ic('account')"></span>{{ t('profile.account') }}</h3>
        <div class="infoline"><span class="k">{{ t('profile.username') }}</span><span class="v mono">{{ auth.userName }}</span></div>
        <div class="infoline"><span class="k">{{ t('profile.roles') }}</span><span class="v"><span v-for="role in auth.roles" :key="role" class="rolechip">{{ role }}</span></span></div>
        <a class="infoline link" href="#/api/token"><span class="k">{{ t('profile.apiTokens') }}</span><span class="v">{{ t('profile.apiTokensHint') }} →</span></a>
      </section>

      <!-- Permissions -->
      <section class="pcard">
        <h3><span class="ic"><img :src="ic('key')"></span>{{ t('profile.permissions') }}</h3>
        <div class="subhead">{{ t('profile.uiAuth', { count: auth.uiAuthorizations.length }) }}</div>
        <div class="perm-list">
          <code v-for="(pattern, i) in auth.uiAuthorizations" :key="'ui-' + i" class="perm">{{ pattern }}</code>
        </div>
      </section>

      <!-- Preferences (full width) -->
      <section class="pcard pcard--full">
        <h3><span class="ic"><img :src="ic('tune')"></span>{{ t('profile.preferences') }}</h3>

        <div class="pref-row">
          <img class="pref-ic" :src="ic('translate')">
          <div class="pt"><div class="ptt">{{ t('profile.language') }}</div></div>
          <select class="psel" :value="i18n.locale" @change="i18n.setLocale($event.target.value)">
            <option v-for="opt in languageItems" :key="opt.value" :value="opt.value">{{ opt.title }}</option>
          </select>
        </div>

        <div class="pref-row">
          <img class="pref-ic" :src="ic('bell-off-outline')">
          <div class="pt"><div class="ptt">{{ t('profile.skipUnsavedConfirmation') }}</div><div class="pth">{{ t('profile.skipUnsavedConfirmationHint') }}</div></div>
          <span class="sw" :class="{ on: skipUnsavedConfirmation }" role="switch" :aria-checked="skipUnsavedConfirmation" @click="onSkipUnsavedChange(!skipUnsavedConfirmation)"></span>
        </div>

        <div class="pref-row">
          <img class="pref-ic" :src="ic('format-line-spacing')">
          <div class="pt"><div class="ptt">{{ t('profile.compact') }}</div><div class="pth">{{ t('profile.compactHint') }}</div></div>
          <span class="sw" :class="{ on: compact }" role="switch" :aria-checked="compact" @click="onCompactChange(!compact)"></span>
        </div>

        <div class="pref-theme-label"><img :src="ic('palette')">{{ t('profile.theme') }}</div>
        <div class="tiles">
          <div v-for="opt in PRESET_OPTIONS" :key="opt.id" class="tile" :class="{ on: preset === opt.id }" @click="choosePreset(opt.id)">
            <div class="sw-strip"><span v-for="(c, i) in opt.swatch" :key="i" :style="{ background: c }" /></div>
            <div class="tile-b">
              <div class="tile-h">
                <span class="moon">{{ opt.dark ? '🌙' : '☀️' }}</span>
                <span class="tile-name">{{ opt.label }}</span>
                <span v-if="preset === opt.id" class="tile-check">✓</span>
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
import { computed, onMounted, ref } from 'vue'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'
import { PRESET_OPTIONS, detectPreset, applyPreset, persistPreset } from '@/plugins/presets.js'
import { detectCompact, applyCompact, persistCompact } from '@/plugins/styles.js'

const auth = useAuthStore()
const appStore = useAppStore()
const i18n = useI18nStore()
const theme = useTheme()
const t = i18n.t

/** Small icon helper — monochrome mdi via Iconify, tinted with the page ink. */
const ic = (n) => `https://api.iconify.design/mdi/${n}.svg?color=%231c1a17&height=22`

/**
 * Local mirror of the persisted preset id — the tile picker uses it to
 * highlight the active selection reactively. `applyPreset` flips both
 * the Vuetify color theme AND the `<html data-style="…">` attribute,
 * so a single click switches the whole look-and-feel atomically.
 */
const preset = ref(detectPreset().id)
function choosePreset(id) {
  preset.value = id
  applyPreset(id, theme)
  persistPreset(id)
}

/**
 * Compact mode — orthogonal global density toggle (see
 * `plugins/styles.js#applyCompact`). Layers over any preset by writing
 * `<html data-compact="true">` and matching CSS at
 * `[data-compact="true"]` in `vuetify-overrides.css`.
 */
const compact = ref(detectCompact())
function onCompactChange(value) {
  compact.value = !!value
  applyCompact(compact.value)
  persistCompact(compact.value)
}

const LOCALE_LABELS = { en: 'English', fr: 'Français' }
const languageItems = computed(() =>
  i18n.SUPPORTED_LOCALES.map((value) => ({ value, title: LOCALE_LABELS[value] || value })),
)

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

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.profile') },
  ])
})
</script>

<style scoped>
.p2026 {
  --surface: #fff; --border: #e9e3d8; --border-2: #ddd5c6;
  --ink: #1c1a17; --ink-2: #5a554c; --ink-3: #8d877b;
  --pill: #faf8f3; --hover: #faf7f1; --ok: #1d9d63; --accent: #2f6df6;
  --font: "Bricolage Grotesque", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
}
.p-title { font-family: var(--font); font-weight: 800; letter-spacing: -.04em; font-size: 30px; margin: 0 0 22px; color: var(--ink); }
.mono { font-family: var(--mono); }

.p-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.pcard--full { grid-column: 1 / -1; }
@media (max-width: 960px) { .p-grid { grid-template-columns: 1fr; } }

.pcard { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 20px 22px; box-shadow: 0 2px 8px rgba(28,26,23,.05); }
.pcard h3 { font-family: var(--font); font-weight: 800; font-size: 18px; margin: 0 0 16px; display: flex; align-items: center; gap: 10px; color: var(--ink); }
.pcard h3 .ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 12%, #fff); }
.pcard h3 .ic img { width: 18px; height: 18px; }

.infoline { display: flex; align-items: center; gap: 12px; padding: 11px 0; text-decoration: none; }
.infoline + .infoline { border-top: 1px solid #f2eee6; }
.infoline .k { font-size: 13px; color: var(--ink-3); font-weight: 600; width: 130px; flex: none; }
.infoline .v { font-weight: 600; font-size: 14px; color: var(--ink); }
.infoline.link .v { color: var(--accent); cursor: pointer; }
.rolechip { background: color-mix(in srgb, var(--accent) 14%, #fff); color: #1b4fd6; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-right: 5px; }

.subhead { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); margin-bottom: 10px; }
.perm-list { display: flex; flex-direction: column; gap: 6px; max-height: 230px; overflow: auto; }
.perm { font-family: var(--mono); font-size: 12px; color: var(--ink-2); background: var(--pill); border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; }

.pref-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; }
.pref-row + .pref-row, .pref-theme-label { border-top: 1px solid #f2eee6; }
.pref-ic { width: 22px; height: 22px; opacity: .7; }
.pref-row .pt { flex: 1; } .ptt { font-weight: 700; font-size: 14px; color: var(--ink); } .pth { font-size: 12.5px; color: var(--ink-3); margin-top: 2px; }
.psel { padding: 9px 12px; border-radius: 11px; border: 1px solid var(--border); background: #fdfcfa; font-family: inherit; font-size: 14px; color: var(--ink); outline: none; min-width: 200px; }
.psel:focus { border-color: #ffbf8a; box-shadow: 0 0 0 4px rgba(255,148,54,.15); }

.sw { width: 46px; height: 26px; border-radius: 20px; background: var(--border-2); position: relative; cursor: pointer; transition: background .2s; flex: none; }
.sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: left .2s; }
.sw.on { background: var(--ok); } .sw.on::after { left: 23px; }

.pref-theme-label { font-weight: 700; font-size: 14px; color: var(--ink); display: flex; align-items: center; gap: 8px; padding: 16px 0 12px; }
.pref-theme-label img { width: 20px; height: 20px; opacity: .7; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.tile { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; transition: .15s; background: var(--surface); }
.tile:hover { transform: translateY(-2px); box-shadow: 0 8px 18px -10px rgba(0,0,0,.3); }
.tile.on { border-color: var(--accent); border-width: 2px; }
.sw-strip { display: flex; height: 30px; } .sw-strip span { flex: 1; }
.tile-b { padding: 7px 10px 9px; }
.tile-h { display: flex; align-items: center; gap: 6px; }
.tile-name { font-size: 12.5px; font-weight: 700; color: var(--ink); }
.tile-check { margin-left: auto; color: var(--accent); font-weight: 800; }
.tile-desc { font-size: 11px; color: var(--ink-3); margin-top: 3px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
