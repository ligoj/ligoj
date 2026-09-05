<template>
  <div class="p2026">
    <header class="hero">
      <div class="hero-avatar">{{ initials }}</div>
      <div class="hero-id">
        <h1>{{ auth.userName || 'invité' }}</h1>
        <p>{{ t('profile.title') }}</p>
        <div class="hero-roles">
          <span v-if="auth.isAdmin" class="rolechip rolechip--admin"><v-icon size="13">mdi-shield-account</v-icon>{{ t('profile.administrator') }}<v-tooltip activator="parent" location="top" :text="t('profile.adminTooltip')" /></span>
          <span v-for="role in auth.roles" :key="role" class="rolechip">{{ role }}</span>
        </div>
      </div>
    </header>

    <div class="p-grid">

      <section class="pcard">
        <h3><span class="ic"><v-icon>mdi-tune</v-icon></span>{{ t('profile.preferences') }}</h3>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-translate</v-icon>
          <div class="pt">
            <div class="ptt">{{ t('profile.language') }}</div>
          </div>
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
          <div class="pt">
            <div class="ptt">{{ t('profile.skipUnsavedConfirmation') }}</div>
            <div class="pth">{{ t('profile.skipUnsavedConfirmationHint') }}</div>
          </div>
          <span class="sw" :class="{ on: skipUnsavedConfirmation }" role="switch" :aria-checked="skipUnsavedConfirmation" @click="onSkipUnsavedChange(!skipUnsavedConfirmation)"></span>
        </div>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-format-line-spacing</v-icon>
          <div class="pt">
            <div class="ptt">{{ t('profile.compact') }}</div>
            <div class="pth">{{ t('profile.compactHint') }}</div>
          </div>
          <span class="sw" :class="{ on: compact }" role="switch" :aria-checked="compact" @click="onCompactChange(!compact)"></span>
        </div>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-motion-pause-outline</v-icon>
          <div class="pt">
            <div class="ptt">{{ t('profile.reduceMotion') }}</div>
            <div class="pth">{{ t('profile.reduceMotionHint') }}</div>
          </div>
          <span class="sw" :class="{ on: reduceMotion }" role="switch" :aria-checked="reduceMotion" @click="onReduceMotionChange(!reduceMotion)"></span>
        </div>

        <div v-if="auth.isAdmin" class="pref-row">
          <v-icon class="pref-ic">mdi-flask-outline</v-icon>
          <div class="pt">
            <div class="ptt">{{ t('profile.demoMode') }}</div>
            <div class="pth">{{ t('profile.demoModeHint') }}</div>
          </div>
          <span class="sw" :class="{ on: demoEnabled }" role="switch" :aria-checked="demoEnabled" @click="setDemoEnabled(!demoEnabled)"></span>
          <v-tooltip activator="parent" location="top" max-width="340" :text="t('profile.demoModeTooltip')" />
        </div>

        <div class="pref-theme-label"><v-icon class="pref-ic">mdi-palette</v-icon>{{ t('profile.theme') }}</div>
        <div class="tiles">
          <button v-for="(opt, i) in PRESET_OPTIONS" :key="opt.id" type="button" class="swatch" :class="{ on: preset === opt.id }" :style="{ '--i': i }" :title="opt.description"
            @click="choosePreset(opt.id)">
            <span class="swatch-circle" :style="{ background: bandBg(opt) }">
              <span class="swatch-gloss" />
              <span v-if="preset === opt.id" class="swatch-check"><v-icon size="20">mdi-check</v-icon></span>
              <span class="swatch-mode" :class="{ dark: opt.dark }"><v-icon size="10">{{ opt.dark ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}</v-icon></span>
            </span>
            <span class="swatch-name">{{ opt.label }}</span>
          </button>
        </div>
      </section>

      <!-- Authentication: provider, last authentication, MFA devices (useMfa) -->
      <section class="pcard pcard--auth">
        <h3><span class="ic"><v-icon>mdi-shield-key-outline</v-icon></span>{{ t('profile.authentication') }}</h3>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-login-variant</v-icon>
          <div class="pt">
            <div class="ptt">{{ t('profile.authProvider') }}</div>
            <div class="pth">{{ providerHint }}</div>
          </div>
          <span class="rolechip">{{ providerLabel }}</span>
        </div>

        <div class="pref-row">
          <v-icon class="pref-ic">mdi-clock-outline</v-icon>
          <div class="pt">
            <div class="ptt">{{ t('profile.lastAuthentication') }}</div>
            <div class="pth">{{ mfa.status.value?.lastConnection ? fmtDate(mfa.status.value.lastConnection) : t('profile.lastAuthenticationUnknown') }}</div>
          </div>
        </div>

        <div class="subhead d-flex align-center">{{ t('profile.mfaDevices') }}<v-chip size="x-small" variant="tonal" color="primary" class="ms-2">{{ mfa.devices.value.length }}</v-chip>
          <button v-if="!mfa.unavailable.value" type="button" class="text-info verify-link ms-auto" @click="openAdd">
            <span class="v"><v-icon size="small">mdi-plus</v-icon>{{ t('profile.mfaAdd') }}</span>
          </button>
        </div>
        <p v-if="mfa.unavailable.value" class="pth mfa-note">{{ t('profile.mfaUnavailable') }}</p>
        <p v-else-if="!mfa.devices.value.length" class="pth mfa-note">{{ t('profile.mfaNone') }}</p>
        <div v-else class="mfa-list">
          <div v-for="device in mfa.devices.value" :key="device.id" class="pref-row mfa-row">
            <v-icon class="pref-ic">{{ device.type === 'PASSKEY' ? 'mdi-fingerprint' : 'mdi-cellphone-key' }}</v-icon>
            <div class="pt">
              <div class="ptt">{{ device.name }}<span v-if="device.defaultDevice" class="rolechip mfa-default">{{ t('profile.mfaDefault') }}</span></div>
              <div class="pth">{{ t('profile.mfaDeviceMeta', { type: t('profile.mfaType.' + device.type), created: fmtDate(device.createdDate), lastUsed: device.lastUsed ? fmtDate(device.lastUsed) : t('profile.mfaNeverUsed') }) }}</div>
            </div>
            <button v-if="!device.defaultDevice" type="button" class="lj-iconbtn" :aria-label="t('profile.mfaSetDefault')" @click="setDefaultDevice(device)">
              <v-icon size="18">mdi-star-outline</v-icon>
              <v-tooltip activator="parent" location="top" :text="t('profile.mfaSetDefault')" />
            </button>
            <button type="button" class="lj-iconbtn danger" :aria-label="t('profile.mfaRemove')" @click="askRemove(device)">
              <v-icon size="18">mdi-delete-outline</v-icon>
              <v-tooltip activator="parent" location="top" :text="t('profile.mfaRemove')" />
            </button>
          </div>
        </div>
        <p v-if="!mfa.unavailable.value" class="pth mfa-note">{{ t('profile.mfaHint') }}</p>
      </section>

      <!-- Permissions: UI / API in tabs (LjSegmented) -->
      <section class="pcard pcard--perm">
        <div class="perm-head">
          <h3><span class="ic"><v-icon>mdi-key</v-icon></span>{{ t('profile.permissions') }}</h3>
          <LjSegmented v-model="permTab" :options="permTabs" />
        </div>
        <template v-if="permTab === 'ui'">
          <div class="perm-list">
            <code v-for="(pattern, i) in auth.uiAuthorizations" :key="'ui-' + i" class="perm">
              <span v-for="(token, j) in tokenizePattern(pattern)" :key="j"
                    :class="'token token--' + token.type">{{ token.value }}</span>
            </code>
          </div>
        </template>
        <template v-else>
          <div class="subhead d-flex align-center">
            <a class="text-info text-decoration-none" href="#/api/token">
              <span class="v">{{ t('profile.apiTokensHint') }}<v-icon size="small">mdi-chevron-right</v-icon></span>
            </a>
            <button type="button" class="text-info verify-link ms-4" @click="openVerify">
              <span class="v"><v-icon size="small">mdi-shield-search</v-icon>{{ t('profile.apiVerify') }}</span>
            </button>
          </div>
          <div class="perm-list">
            <code v-for="(entry, i) in auth.apiAuthorizations" :key="'api-' + i" class="perm perm--api">
              <span class="method" :class="methodClass(entry.method)">{{ entry.method || '?' }}</span>
              <span class="pattern">
                <span v-for="(token, j) in apiTokens(entry.pattern)" :key="j"
                      :class="'token token--' + token.type">{{ token.value }}</span>
              </span>
            </code>
          </div>
        </template>
      </section>

    </div>

    <!-- Register a device: choose the method, then an authenticator (QR code +
         secret, confirmed by a first code) or an access key (generated, shown once) -->
    <LjDialog v-model="addOpen" :title="t('profile.mfaAddTitle')" icon="mdi-cellphone-key" :max-width="560">
      <div v-if="!addMethod" class="mfa-methods">
        <button type="button" class="mfa-method" @click="chooseMethod('totp')">
          <v-icon size="26">mdi-cellphone-key</v-icon>
          <span class="mm-txt"><b>{{ t('profile.mfaMethodTotp') }}</b><small>{{ t('profile.mfaMethodTotpHint') }}</small></span>
        </button>
        <button type="button" class="mfa-method" :disabled="!webAuthnSupported" @click="chooseMethod('passkey')">
          <v-icon size="26">mdi-fingerprint</v-icon>
          <span class="mm-txt"><b>{{ t('profile.mfaMethodPasskey') }}</b><small>{{ webAuthnSupported ? t('profile.mfaMethodPasskeyHint') : t('profile.mfaPasskeyUnsupported') }}</small></span>
        </button>
      </div>
      <div v-else-if="addMethod === 'passkey'" class="mfa-setup">
        <LigojTextField v-model="addName" :label="t('profile.mfaName')" :hint="t('profile.mfaNameHint')" persistent-hint variant="outlined" density="compact"
          :error-messages="addError === 'already-exist' ? [t('profile.mfaNameTaken')] : addError === 'invalid' ? [t('profile.mfaPasskeyInvalid')] : addError === 'error' ? [t('common.loadError')] : []" @update:model-value="addError = ''" @keyup.enter="registerPasskey" />
        <p class="mfa-scan">{{ t('profile.mfaPasskeyIntro') }}</p>
      </div>
      <div v-else-if="setupData" class="mfa-setup">
        <LigojTextField v-model="addName" :label="t('profile.mfaName')" :hint="t('profile.mfaNameHint')" persistent-hint variant="outlined" density="compact"
          :error-messages="addError === 'already-exist' ? [t('profile.mfaNameTaken')] : []" @update:model-value="addError = ''" />
        <p class="mfa-scan">{{ t('profile.mfaScan') }}</p>
        <div class="mfa-qr">
          <img v-if="qrUrl" :src="qrUrl" alt="QR" width="180" height="180" />
          <code class="mfa-secret">{{ setupData.secret }}</code>
        </div>
        <LigojTextField :model-value="addCode" :label="t('profile.mfaCode')" :hint="t('profile.mfaCodeHint')" persistent-hint variant="outlined" density="compact" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
          :error-messages="addError === 'invalid-code' ? [t('profile.mfaInvalidCode')] : addError === 'error' ? [t('common.loadError')] : []" @update:model-value="onCodeInput" @keyup.enter="registerDevice" />
      </div>
      <div v-else class="mfa-setup-loading"><v-progress-circular indeterminate size="28" /></div>
      <template #footer>
        <LjButton variant="ghost" @click="addOpen = false">{{ t('common.cancel') }}</LjButton>
        <LjButton v-if="addMethod === 'passkey'" icon="mdi-fingerprint" :disabled="!addName.trim() || addBusy" @click="registerPasskey">{{ t('profile.mfaPasskeyRegister') }}</LjButton>
        <LjButton v-else-if="addMethod === 'totp'" icon="mdi-check" :disabled="!setupData || !addName.trim() || !isOtpCode(addCode) || addBusy" @click="registerDevice">{{ t('profile.mfaRegister') }}</LjButton>
      </template>
    </LjDialog>

    <!-- Remove a device -->
    <LjDialog v-model="removeOpen" :title="t('profile.mfaRemoveTitle')" icon="mdi-delete-outline" :max-width="460">
      <p class="mfa-note">{{ t('profile.mfaRemoveText', { name: removeTarget?.name || '' }) }}</p>
      <template #footer>
        <LjButton variant="ghost" @click="removeOpen = false">{{ t('common.cancel') }}</LjButton>
        <LjButton variant="danger" icon="mdi-delete-outline" :disabled="removeBusy" @click="removeDevice">{{ t('profile.mfaRemove') }}</LjButton>
      </template>
    </LjDialog>

    <!-- Shared API access verification dialog (host ApiVerifyDialog),
         audited against the CURRENT session (admin bypass applies). -->
    <ApiVerifyDialog v-model="verifyOpen" :authorizations="auth.apiAuthorizations" :admin="auth.isAdmin" />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'
import { useAppStore } from '@/stores/app.js'
import ApiVerifyDialog from '@/components/ApiVerifyDialog.vue'
import LjSegmented from '@/components/LjSegmented.vue'
import LjDialog from '@/components/LjDialog.vue'
import LjButton from '@/components/LjButton.vue'
import LigojTextField from '@/components/LigojTextField.vue'
import QRCode from 'qrcode'
import { useMfa, isOtpCode, sanitizeOtpCode } from '@/composables/useMfa.js'
import { isWebAuthnSupported, toCreationOptions, serializeRegistration } from '@/utils/webauthn.js'
import { PRESET_OPTIONS, detectPreset, applyPreset, persistPreset } from '@/plugins/presets.js'
import { detectCompact, applyCompact, persistCompact, detectReduceMotion, applyReduceMotion, persistReduceMotion } from '@/plugins/styles.js'
import { useDemoMode } from '@/composables/useDemoMode.js'

const auth = useAuthStore()
const i18n = useI18nStore()
const app = useAppStore()
const theme = useTheme()
const t = i18n.t

const initials = computed(() => (auth.userName || '?').slice(0, 2).toUpperCase())

function methodClass(method) {
  return method ? `method--${method.toLowerCase()}` : ''
}

// Detect regex special tokens; everything else stays literal.
const TOKEN_RE = /(\\.|\^|\$|\.[*+?]|\.|\*|\+|\?|\([^)]*\)|\[[^\]]*\]|\{[\d,]+\})/g

function tokenizePattern(pattern) {
  if (!pattern) return []
  const tokens = []
  let lastIndex = 0
  let match
  TOKEN_RE.lastIndex = 0
  while ((match = TOKEN_RE.exec(pattern)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'literal', value: pattern.slice(lastIndex, match.index) })
    }
    tokens.push({ type: 'regex', value: match[0] })
    lastIndex = TOKEN_RE.lastIndex
  }
  if (lastIndex < pattern.length) {
    tokens.push({ type: 'literal', value: pattern.slice(lastIndex) })
  }
  return tokens
}

// Strip the `^rest/` / `^rest$` prefix common to every API permission;
// it's the same for every entry so it carries no information.
function prettyApiPattern(pattern) {
  if (!pattern) return ''
  if (pattern === '^rest$') return '/'
  return pattern.replace(/^\^rest\//, '/')
}

function apiTokens(pattern) {
  return tokenizePattern(prettyApiPattern(pattern))
}

/* --- API access verification (shared ApiVerifyDialog) --- */
const verifyOpen = ref(false)
function openVerify() { verifyOpen.value = true }

/* --- permissions tabs --- */
const permTab = ref('ui')
const permTabs = computed(() => [
  { value: 'ui', label: `${t('profile.uiAuth')} (${auth.uiAuthorizations.length})` },
  { value: 'api', label: `${t('profile.apiAuth')} (${auth.apiAuthorizations.length})` },
])

/* --- authentication card --- */
const mfa = useMfa()
function fmtDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(i18n.locale || undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
// Primary identity provider node (session data `iam-primary`, e.g. "service:id:ldap:dig"):
// the tool segment names the plug-in; empty means the internal accounts.
const providerNode = computed(() => String(auth.appSettings?.data?.['iam-primary'] || '').trim())
const providerLabel = computed(() => {
  const parts = providerNode.value.split(':')
  if (parts.length < 3) return t('profile.authProviderInternal')
  const tool = parts[2]
  return tool.charAt(0).toUpperCase() + tool.slice(1)
})
const providerHint = computed(() => providerNode.value ? t('profile.authProviderHint', { node: providerNode.value }) : t('profile.authProviderInternalHint'))

const addOpen = ref(false)
const addMethod = ref('')
const addName = ref('')
const addCode = ref('')
const addError = ref('')
const addBusy = ref(false)
const setupData = ref(null)
const qrUrl = ref('')
const webAuthnSupported = isWebAuthnSupported()
function openAdd() {
  addMethod.value = ''
  addName.value = ''
  addCode.value = ''
  addError.value = ''
  setupData.value = null
  qrUrl.value = ''
  addOpen.value = true
}
async function chooseMethod(method) {
  addMethod.value = method
  if (method !== 'totp') return
  const data = await mfa.setup()
  if (!data) { addOpen.value = false; return }
  setupData.value = data
  try { qrUrl.value = await QRCode.toDataURL(data.uri, { width: 180, margin: 1 }) } catch { qrUrl.value = '' }
}
// Passkey: creation options from the API, the browser prompts the authenticator, the credential is registered
async function registerPasskey() {
  if (!addName.value.trim() || addBusy.value || !webAuthnSupported) return
  addBusy.value = true
  try {
    const options = await mfa.setupPasskey()
    if (!options) { addError.value = 'error'; return }
    let credential
    try {
      credential = await navigator.credentials.create({ publicKey: toCreationOptions(options) })
    } catch {
      addError.value = 'invalid'
      return
    }
    if (!credential) { addError.value = 'invalid'; return }
    const result = await mfa.registerPasskey(addName.value.trim(), serializeRegistration(credential))
    if (result.ok) { addOpen.value = false; await mfa.load() } else addError.value = result.error
  } finally { addBusy.value = false }
}
async function setDefaultDevice(device) {
  await mfa.setDefault(device.id)
  await mfa.load()
}
// Digits only, at most 6: the code is complete when exactly 6 digits are typed
function onCodeInput(value) { addCode.value = sanitizeOtpCode(value); addError.value = '' }
async function registerDevice() {
  if (!setupData.value || !addName.value.trim() || !isOtpCode(addCode.value) || addBusy.value) return
  addBusy.value = true
  try {
    const result = await mfa.register({ name: addName.value.trim(), secret: setupData.value.secret, code: addCode.value })
    if (result.ok) { addOpen.value = false; await mfa.load() } else addError.value = result.error
  } finally { addBusy.value = false }
}
const removeOpen = ref(false)
const removeTarget = ref(null)
const removeBusy = ref(false)
function askRemove(device) { removeTarget.value = device; removeOpen.value = true }
async function removeDevice() {
  if (!removeTarget.value || removeBusy.value) return
  removeBusy.value = true
  try { await mfa.remove(removeTarget.value.id); removeOpen.value = false; await mfa.load() } finally { removeBusy.value = false }
}

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

const reduceMotion = ref(detectReduceMotion())
function onReduceMotionChange(value) { reduceMotion.value = !!value; applyReduceMotion(reduceMotion.value); persistReduceMotion(reduceMotion.value) }

// Admin-only demonstration mode (fake projects/tools blended into the views).
const { enabled: demoEnabled, setEnabled: setDemoEnabled } = useDemoMode()

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

onMounted(() => {
  mfa.load()
  if (typeof document !== 'undefined') document.addEventListener('click', onDocClick)
  // Factory form so the trail re-localizes on a language switch; explicit icon
  // since /profile isn't in the sidebar NAV the leaf-icon resolver reads.
  app.setBreadcrumbs(() => [{ title: t('nav.home'), to: '/' }, { title: t('nav.profile'), icon: 'mdi-account-circle' }])
})
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
  /* Shape/type from the active style's design tokens (assets/vuetify-overrides.css)
   * so this hand-rolled 2026 view re-shapes with the theme, not just recolors.
   * Fallbacks keep the original look when no style attribute is set. */
  --font: var(--lj-font, var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif));
  --mono: var(--lj-mono, "JetBrains Mono", ui-monospace, monospace);
  --radius: var(--lj-radius, 18px);
  --radius-sm: var(--lj-radius-sm, 10px);
  --radius-lg: var(--lj-radius-lg, 22px);
  --shadow: var(--lj-shadow, 0 1px 3px rgba(0, 0, 0, .05), 0 10px 28px -22px rgba(0, 0, 0, .5));
  --border-w: var(--lj-border-width, 1px);
  --border-c: var(--lj-border-color, var(--line));
  --bold: var(--lj-weight-bold, 800);
  color: var(--ink);
  font-family: var(--font);
}

.mono {
  font-family: var(--mono);
}

.hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px 26px;
  margin-bottom: 20px;
  border-radius: var(--radius-lg);
  color: var(--on-primary);
  background: radial-gradient(600px 200px at 100% -40%, rgba(255, 255, 255, .18), transparent 70%), linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000));
  box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--primary) 80%, transparent);
}

.hero-avatar {
  width: 64px;
  height: 64px;
  flex: none;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 22px;
  background: rgba(255, 255, 255, .18);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25);
}

.hero-id h1 {
  font-family: var(--font);
  font-weight: var(--bold);
  letter-spacing: var(--lj-tracking, -.03em);
  font-size: 28px;
  margin: 0;
  line-height: 1.05;
}

.hero-id p {
  margin: 3px 0 9px;
  font-size: 14px;
  opacity: .85;
  font-weight: 500;
}

.hero-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rolechip {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .02em;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, .2);
  color: var(--on-primary);
}

/* Administrator badge — accent + shield icon, set apart from plain roles. */
.rolechip--admin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(var(--v-theme-secondary), .9);
  color: rgb(var(--v-theme-on-secondary));
  cursor: default;
}

.p-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.pcard--full {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .p-grid {
    grid-template-columns: 1fr;
  }
}

.pcard {
  background: var(--surface);
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  border-radius: var(--radius);
  padding: 20px 22px;
  box-shadow: var(--shadow);
}

.pcard h3 {
  font-family: var(--font);
  font-weight: var(--bold);
  font-size: 18px;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}

.pcard h3 .ic {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--primary) 16%, transparent);
  color: var(--primary);
}

.infoline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  text-decoration: none;
}

.infoline+.infoline {
  border-top: 1px solid var(--line);
}

.infoline .k {
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
  width: 130px;
  flex: none;
}

.infoline .v {
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.infoline.link .v {
  color: var(--primary);
  cursor: pointer;
}

.subhead {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--muted);
  margin-bottom: 10px;
}

.subhead--api {
  margin-top: 16px;
}

/* Permissions header: title + UI/API tabs */
.perm-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.perm-head h3 { margin-bottom: 0; }
.perm-head + .perm-list, .perm-head + .subhead { margin-top: 14px; }

/* Authentication card */
.mfa-note { margin: 0 0 8px; }
.mfa-list { display: flex; flex-direction: column; }
.mfa-row { padding-top: 8px; padding-bottom: 8px; }
.mfa-setup { display: flex; flex-direction: column; gap: 12px; }
.mfa-scan { margin: 0; font-size: 13.5px; line-height: 1.5; }
.mfa-qr { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.mfa-qr img { border-radius: 10px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); background: #fff; }
.mfa-secret { font-size: 12px; word-break: break-all; padding: 6px 8px; border-radius: 6px; background: rgba(var(--v-theme-on-surface), .06); flex: 1 1 200px; }
.mfa-setup-loading { display: grid; place-items: center; padding: 24px; }
.mfa-default { margin-left: 8px; font-size: 10.5px; vertical-align: middle; }
.mfa-methods { display: grid; gap: 10px; }
.mfa-method { display: flex; align-items: center; gap: 14px; text-align: left; padding: 12px 14px; border: var(--border-w) var(--lj-border-style, solid) var(--border-c); border-radius: var(--radius); background: var(--surface); color: inherit; cursor: pointer; font: inherit; }
.mfa-method:hover { border-color: var(--accent); }
.mm-txt { display: flex; flex-direction: column; gap: 2px; }
.mm-txt small { color: var(--muted); font-size: 12px; }
.mfa-method:disabled { opacity: .55; cursor: not-allowed; }

/* The Permissions card stretches to the grid row set by the (taller)
 * Preferences card. Distribute that height: headers stay fixed, the two
 * auth lists split the remaining space evenly — no blank band under the
 * lists while they scroll. The 200px basis keeps the intrinsic height
 * bounded in the stacked single-column layout. */
.pcard--perm {
  display: flex;
  flex-direction: column;
}

.pcard--perm h3,
.pcard--perm .subhead {
  flex: none;
}

.perm-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 200px;
  min-height: 0;
  overflow: auto;
}

.perm {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  background: var(--pill);
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
}

.perm--api {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}

.perm--api .method {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: #fff;
  font-family: var(--font);
  text-transform: uppercase;
  flex: none;
  background: rgba(var(--v-theme-on-surface), .45);
  /* fallback méthode inconnue */
}

.perm--api .pattern {
  font-family: var(--mono);
  color: var(--muted);
}

.perm--api .method--get {
  background: #2196f3;
}

.perm--api .method--post {
  background: #4caf50;
}

.perm--api .method--put {
  background: #ff9800;
}

.perm--api .method--patch {
  background: #9c27b0;
}

.perm--api .method--delete {
  background: #f44336;
}

.perm--api .method--head,
.perm--api .method--options {
  background: #607d8b;
}

/* "Verify" opener next to the API-tokens link. */
.verify-link {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.verify-link .v,
.subhead--api .v {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.token {
  white-space: pre;
}

.token--literal {
  color: var(--ink);
}

.token--regex {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.pref-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
}

.pref-row+.pref-row,
.pref-theme-label {
  border-top: 1px solid var(--line);
}

.pref-ic {
  color: var(--muted);
}

.pref-row .pt {
  flex: 1;
}

.ptt {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
}

.pth {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 2px;
}

.langsel {
  position: relative;
  min-width: 210px;
}

.langsel-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  background: var(--pill);
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: border-color .15s;
}

.langsel-btn:hover {
  border-color: var(--primary);
}

.langsel-btn .flag {
  font-size: 17px;
  line-height: 1;
}

.langsel-btn .caret {
  margin-left: auto;
  color: var(--muted);
  transition: transform .2s;
}

.langsel.open .langsel-btn .caret {
  transform: rotate(180deg);
}

.langsel-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--surface);
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  border-radius: var(--radius);
  box-shadow: var(--lj-shadow-lg, 0 18px 44px -18px rgba(0, 0, 0, .5));
  padding: 6px;
  animation: langmenu .13s ease;
}

@keyframes langmenu {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.langsel-opt {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border: 0;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.langsel-opt:hover {
  background: var(--hover);
}

.langsel-opt.sel {
  color: var(--primary);
}

.langsel-opt .flag {
  font-size: 17px;
  line-height: 1;
}

.langsel-opt .ok {
  margin-left: auto;
  color: var(--primary);
}

.sw {
  width: 46px;
  height: 26px;
  border-radius: 20px;
  background: var(--line);
  position: relative;
  cursor: pointer;
  transition: background .2s;
  flex: none;
}

.sw::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .3);
  transition: left .2s;
}

.sw.on {
  background: var(--ok);
}

.sw.on::after {
  left: 23px;
}

.pref-theme-label {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0 12px;
}

/* macOS-style swatch grid: a polished colour orb per theme + its name. */
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(98px, 1fr));
  gap: 20px 14px;
}

.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 4px 2px;
  opacity: 0;
  transform: translateY(8px);
  animation: swrise .42s cubic-bezier(.2, .7, .3, 1) forwards;
  animation-delay: calc(var(--i, 0) * 28ms);
}

@keyframes swrise {
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .swatch {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.swatch-circle {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  isolation: isolate;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14), inset 0 -6px 12px -4px rgba(0, 0, 0, .35), 0 6px 16px -6px rgba(0, 0, 0, .45);
  transition: transform .2s cubic-bezier(.2, .7, .3, 1), box-shadow .2s;
}

/* Specular highlight → glossy 3D orb. */
.swatch-gloss {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(58% 48% at 34% 26%, rgba(255, 255, 255, .6), rgba(255, 255, 255, .08) 45%, transparent 62%);
}

.swatch:hover .swatch-circle {
  transform: translateY(-2px) scale(1.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18), inset 0 -6px 12px -4px rgba(0, 0, 0, .35), 0 14px 26px -8px rgba(0, 0, 0, .5);
}

.swatch.on .swatch-circle {
  box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--primary), 0 0 22px -2px rgba(var(--v-theme-primary), .55), 0 8px 18px -6px rgba(0, 0, 0, .45);
}

.swatch:focus-visible {
  outline: none;
}

.swatch:focus-visible .swatch-circle {
  box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px rgba(var(--v-theme-primary), .6);
}

.swatch-check {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  border-radius: 50%;
  z-index: 2;
  background: radial-gradient(circle, rgba(0, 0, 0, .34), rgba(0, 0, 0, .14));
  text-shadow: 0 1px 5px rgba(0, 0, 0, .7);
}

/* Frosted mode chip (sun / moon) — subtle, not a solid sticker. */
.swatch-mode {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  z-index: 3;
  color: #c2691a;
  background: rgba(255, 255, 255, .92);
  backdrop-filter: blur(4px);
  box-shadow: 0 0 0 2px var(--surface), 0 2px 5px -1px rgba(0, 0, 0, .35);
}

.swatch-mode.dark {
  color: #7c4dff;
}

.swatch-name {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  text-align: center;
  line-height: 1.25;
  max-width: 98px;
  letter-spacing: -.005em;
  transition: color .15s;
}

.swatch.on .swatch-name {
  color: var(--ink);
  font-weight: 800;
}

.swatch:hover .swatch-name {
  color: var(--ink);
}
</style>
