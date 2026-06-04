<!--
  LoginView — 2026 "Vibrant" login for the standalone app-ui-2026.

  Ported from the (now legacy) app-ui/.../LoginApp2026.vue. The real
  behaviour is preserved (login / recovery / reset modes, CAPTCHA, field
  validation, toasts, custom locale picker) but adapted to the autonomous
  app: theme-adaptive styling (rgb(var(--v-theme-*)) — light/dark), in-SPA
  navigation via vue-router, and the core auth/i18n stores reused. The OIDC
  auto-redirect probe is intentionally dropped — this page is a preview of
  the redesign and always shows the form.
-->
<template>
  <main class="login-bg">
    <!-- Decorative multi-colour aurora (orange / coral / blue — echoing the
         Ligoj logo). Purely cosmetic, hidden from a11y tree. -->
    <div class="aurora" aria-hidden="true"><span class="b b1" /><span class="b b2" /><span class="b b3" /></div>
    <div class="card-wrap">
    <section class="card">
      <header class="card-head">
        <div class="locale-sel" :class="{ open: langOpen }">
          <button type="button" class="locale-btn" aria-label="Language" @click="langOpen = !langOpen">
            <span class="lflag">{{ currentLoc.flag }}</span>
            <span class="llabel">{{ currentLoc.label }}</span>
            <span class="lcaret">▾</span>
          </button>
          <div v-if="langOpen" class="locale-menu">
            <button v-for="loc in LOCALES" :key="loc.code" type="button" class="locale-opt" :class="{ sel: loc.code === locale }" @click="pickLocale(loc.code)">
              <span class="lflag">{{ loc.flag }}</span><span class="llabel">{{ loc.label }}</span>
              <span v-if="loc.code === locale" class="lok">✓</span>
            </button>
          </div>
        </div>
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" class="logo" aria-label="Ligoj">
          <defs>
            <path d="M20 70 C20 70 2 87 8 118 C16 155 53 155 53 155 L53 117 C53 117 46 117 42 112 C36 104 40 96 40 96 L20 70Z" id="ll1" />
            <path d="M53 117L129 117L129 155L53 155L53 117Z" id="ll2" />
            <path d="M151 117L131 117L131 155L151 155L151 117Z" id="ll3" />
            <path d="M53 10L91 10L91 117L53 117L53 10Z" id="ll4" />
          </defs>
          <use fill="#034b80" href="#ll2" /><use fill="#ff6900" href="#ll3" />
          <use fill="#4589ca" href="#ll4" /><use fill="#ff6900" href="#ll1" />
        </svg>
        <p class="subtitle">{{ msg['title-' + mode] }}</p>
      </header>

      <div class="card-body">
        <p v-if="infoMsg" class="alert alert-info">{{ infoMsg }}</p>

        <form ref="formRef" @submit.prevent="submit" novalidate>
          <label class="field">
            <span class="label">{{ msg.username }}</span>
            <input v-model="username" type="text" autocomplete="username" :autofocus="mode !== 'reset'" :disabled="mode === 'reset'" :readonly="mode === 'reset'" data-test="username"
              @input="clearFieldError('username')" />
            <span v-if="fieldErrors.username" class="field-error">{{ fieldErrors.username }}</span>
          </label>

          <label v-if="mode !== 'recovery'" class="field">
            <span class="label">{{ mode === 'reset' ? msg.newPassword : msg.password }}</span>
            <span class="input-wrap">
              <input v-model="password" :type="showPwd ? 'text' : 'password'" autocomplete="current-password" data-test="password" @input="clearFieldError('password')" />
              <button type="button" class="toggle" @click="showPwd = !showPwd" :aria-label="showPwd ? 'Hide password' : 'Show password'">
                <svg class="toggle-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path :d="showPwd ? PATH_EYE_OFF : PATH_EYE" fill="currentColor" />
                </svg>
              </button>
            </span>
            <span v-if="mode === 'reset'" class="field-hint">{{ msg.helpPassword }}</span>
            <span v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</span>
          </label>

          <label v-if="mode === 'reset'" class="field">
            <span class="label">{{ msg.passwordConfirm }}</span>
            <input v-model="passwordConfirm" :type="showPwd ? 'text' : 'password'" autocomplete="new-password" @input="clearFieldError('passwordConfirm')" />
            <span v-if="fieldErrors.passwordConfirm" class="field-error">{{ fieldErrors.passwordConfirm }}</span>
          </label>

          <label v-if="mode === 'recovery'" class="field">
            <span class="label">{{ msg.mail }}</span>
            <input v-model="mail" type="email" @input="clearFieldError('mail')" />
            <span v-if="fieldErrors.mail" class="field-error">{{ fieldErrors.mail }}</span>
          </label>

          <div v-if="mode !== 'login'" class="field captcha-field">
            <div class="captcha-row">
              <img :src="captchaSrc" alt="CAPTCHA" class="captcha-img" @click="refreshCaptcha" />
              <button type="button" class="icon-btn" @click="refreshCaptcha" aria-label="Refresh CAPTCHA">
                &#x21bb;
              </button>
            </div>
            <span class="label">{{ msg.captcha }}</span>
            <input v-model="captcha" type="text" autocomplete="off" @input="clearFieldError('captcha')" />
            <span class="field-hint">{{ msg.helpCaptcha }}</span>
            <span v-if="fieldErrors.captcha" class="field-error">{{ fieldErrors.captcha }}</span>
          </div>

          <button type="submit" class="submit" :disabled="loading" data-test="submit">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            {{ msg['submit-' + mode] }}
          </button>
        </form>

        <div class="links">
          <button v-if="mode === 'login'" type="button" class="link" @click="switchMode('recovery')">
            {{ msg.recover }}
          </button>
          <button v-if="mode !== 'login'" type="button" class="link" @click="switchMode('login')">
            {{ msg.back }}
          </button>
        </div>
      </div>
    </section>
    </div>

    <!-- Toast stack: floats over the card, doesn't shift layout -->
    <div class="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast--${t.severity}`" role="status" :data-test="t.severity === 'error' ? 'error-alert' : undefined">
        <span class="toast-message">{{ t.message }}</span>
        <button type="button" class="toast-close" aria-label="Dismiss" @click="dismissToast(t.id)">&times;</button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const i18nStore = useI18nStore()

const LOCALES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' /* 🇬🇧 */ },
  { code: 'fr', label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' /* 🇫🇷 */ },
]

/** MDI path data inlined so the bundle stays small — pulling @mdi/font in
 *  just for these two glyphs is overkill. Sourced verbatim from
 *  `mdi-eye-outline` and `mdi-eye-off-outline`. */
const PATH_EYE = 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z'
const PATH_EYE_OFF = 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z'

const MESSAGES = {
  fr: {
    username: 'Identifiant',
    password: 'Mot de passe',
    newPassword: 'Nouveau mot de passe',
    passwordConfirm: 'Confirmation mot de passe',
    mail: 'Mail',
    captcha: 'CAPTCHA',
    'title-login': 'Authentification',
    'title-reset': 'Réinitialiser le mot de passe',
    'title-recovery': 'Demande de réinitialisation',
    'submit-login': 'Se connecter',
    'submit-reset': 'Valider',
    'submit-recovery': 'Envoyer',
    recover: 'Mot de passe oublié',
    back: 'Retour',
    required: 'Ce champ est requis',
    helpPassword: '8 caractères min. avec majuscules, minuscules et chiffres',
    helpCaptcha: 'Caractères apparaissant dans l\'image ci-dessus',
    validating: 'Validation ...',
    'message-reset': 'Saisissez votre nouveau mot de passe deux fois, ainsi que le texte de sécurité.',
    'message-recovery': 'Saisissez votre identifiant, l\'adresse mail correspondante ainsi que le texte de sécurité. Un mail vous sera envoyé.',
    'success-login': 'Authentifié',
    'success-reset': 'Mot de passe réinitialisé',
    'success-recovery': 'Requête envoyée',
    'success-logout': 'Vous êtes déconnecté',
    'error-technical': 'Erreur technique',
    'error-password': 'Mots de passe différents',
    'error-password-complexity': 'Mot de passe trop faible — 8 ou plus majuscules, minuscules et chiffres',
    'error-password-policy': 'Le nouveau mot de passe est dans l\'historique des anciens mots de passe',
    'error-login': 'Authentification échouée',
    'error-mail': 'Mail non envoyé',
    'error-concurrency': 'Compte utilisé ailleurs en ce moment',
    'error-reset': 'Jeton expiré',
    'error-connected': 'Vous devez d\'abord vous déconnecter',
    'error-captcha': 'CAPTCHA non concordant',
    'error-cookie': 'Les Cookies doivent être acceptés pour ce site',
    'error-network': 'Erreur réseau. Veuillez réessayer.',
    'error-expired': 'Votre session a expiré. Veuillez vous reconnecter.',
    'error-unavailable': 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.',
    'error-denied': 'Accès refusé. Veuillez vous reconnecter.',
    'password-weak': 'Trop faible, 8 ou plus majuscules, minuscules et chiffres',
    'password-mismatch': 'Mots de passe différents',
  },
  en: {
    username: 'Username',
    password: 'Password',
    newPassword: 'New password',
    passwordConfirm: 'Confirm password',
    mail: 'Email',
    captcha: 'CAPTCHA',
    'title-login': 'Sign in',
    'title-reset': 'Reset password',
    'title-recovery': 'Password recovery',
    'submit-login': 'Sign in',
    'submit-reset': 'Validate',
    'submit-recovery': 'Send request',
    recover: 'Forgot password',
    back: 'Back',
    required: 'This field is required',
    helpPassword: '8+ chars with uppercase, lowercase and digits',
    helpCaptcha: 'Characters appearing in the above picture',
    validating: 'Validating ...',
    'message-reset': 'Provide your new password twice and the security text.',
    'message-recovery': 'Provide your username, the corresponding email and the security characters. A mail will be sent to continue the process.',
    'success-login': 'Authentication succeed',
    'success-reset': 'Password has been reset',
    'success-recovery': 'Request has been sent',
    'success-logout': 'You are now logged out',
    'error-technical': 'Technical error',
    'error-password': 'Passwords do not match',
    'error-password-complexity': 'Password is too weak — 8+ uppercase, lowercase and digit chars',
    'error-password-policy': 'Password is in history of old passwords',
    'error-login': 'Authentication failed',
    'error-mail': 'Mail cannot be sent',
    'error-concurrency': 'Your account is being used somewhere else',
    'error-reset': 'Expired token',
    'error-connected': 'You have to logout first',
    'error-captcha': 'CAPTCHA did not match',
    'error-cookie': 'Cookies must be accepted for this site',
    'error-network': 'Network error. Please try again.',
    'error-expired': 'Your session has expired. Please sign in again.',
    'error-unavailable': 'Service temporarily unavailable. Please try again in a few moments.',
    'error-denied': 'Access denied. Please sign in again.',
    'password-weak': 'Too weak, 8+ uppercase, lowercase and digit chars',
    'password-mismatch': 'Passwords do not match',
  },
}

/* Drive the picker off the app's i18n store (persists to localStorage
 * 'ligoj-locale' and updates the live app). Fall back to FR/EN only. */
function initialLocale() {
  const cur = (i18nStore.locale || '').slice(0, 2)
  return MESSAGES[cur] ? cur : 'en'
}
const locale = ref(initialLocale())

/**
 * `msg` is a `reactive` object (NOT a `computed` ref) so plain
 * `msg['error-denied']` works the same in `<script setup>` JS as it does
 * in the template — a computed ref only auto-unwraps inside templates, so
 * `msg['x']` in script would be `undefined` and silently swallow toasts.
 */
const msg = reactive({ ...MESSAGES[locale.value] })

function setLocale(loc) {
  if (!MESSAGES[loc]) return
  locale.value = loc
  Object.assign(msg, MESSAGES[loc])
  // Propagate to the core i18n store (syncs localStorage + the live app).
  try { i18nStore.setLocale(loc) } catch { /* ignore */ }
  if (typeof document !== 'undefined') document.documentElement.lang = loc
}

/* Custom language picker (replaces the native <select>). */
const langOpen = ref(false)
const currentLoc = computed(() => LOCALES.find((l) => l.code === locale.value) || LOCALES[0])
function pickLocale(code) { setLocale(code); langOpen.value = false }
function onDocClick(e) { if (!e.target.closest('.locale-sel')) langOpen.value = false }

const formRef = ref(null)
const mode = ref('login')
const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const mail = ref('')
const captcha = ref('')
const loading = ref(false)
const infoMsg = ref('')

/* -------- toast notifications --------
 * Floating snackbars for errors and one-shot successes. The inline
 * `infoMsg` stays for contextual mode-switch help pinned to the form.
 */
const toasts = ref([])
let toastSeq = 0

function pushToast(severity, message, ms = 6000) {
  if (!message) return
  const id = ++toastSeq
  toasts.value.push({ id, severity, message })
  if (ms > 0) setTimeout(() => dismissToast(id), ms)
  return id
}

function dismissToast(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}
const showPwd = ref(false)
const token = ref('')
const captchaSrc = ref('')
const fieldErrors = reactive({})

function refreshCaptcha() {
  captchaSrc.value = 'captcha.png?' + Date.now()
}

function clearFieldError(field) {
  if (fieldErrors[field]) fieldErrors[field] = ''
}

function clearMessages() {
  infoMsg.value = ''
  toasts.value = []
}

function validate() {
  Object.keys(fieldErrors).forEach(k => (fieldErrors[k] = ''))
  let valid = true
  if (mode.value !== 'reset' && !username.value) {
    fieldErrors.username = msg.required
    valid = false
  }
  if (mode.value !== 'recovery' && !password.value) {
    fieldErrors.password = msg.required
    valid = false
  }
  if (mode.value === 'reset') {
    if (password.value && !(/[A-Z]/.test(password.value) && /[a-z]/.test(password.value) && /[0-9]/.test(password.value) && password.value.length >= 8)) {
      fieldErrors.password = msg['password-weak']
      valid = false
    }
    if (!passwordConfirm.value) {
      fieldErrors.passwordConfirm = msg.required
      valid = false
    } else if (passwordConfirm.value !== password.value) {
      fieldErrors.passwordConfirm = msg['password-mismatch']
      valid = false
    }
  }
  if (mode.value === 'recovery' && !mail.value) {
    fieldErrors.mail = msg.required
    valid = false
  }
  if (mode.value !== 'login' && !captcha.value) {
    fieldErrors.captcha = msg.required
    valid = false
  }
  return valid
}

function switchMode(newMode) {
  clearMessages()
  Object.keys(fieldErrors).forEach(k => (fieldErrors[k] = ''))
  mode.value = newMode
  captcha.value = ''
  password.value = ''
  passwordConfirm.value = ''
  if (newMode !== 'login') {
    refreshCaptcha()
    infoMsg.value = msg['message-' + newMode] || ''
  }
}

function handleError(status, body) {
  if (status === 400) {
    if (body?.errors) {
      if (body.errors.password) {
        pushToast('error', msg['error-password-complexity'])
      } else if (body.errors.session) {
        pushToast('error', msg['error-cookie'])
      } else {
        pushToast('error', msg['error-captcha'])
      }
    } else {
      pushToast('error', msg['error-technical'])
    }
  } else if (status === 403) {
    pushToast('error', msg['error-connected'])
  } else if (status === 503) {
    pushToast('error', msg['error-mail'])
  } else {
    pushToast('error', msg['error-' + mode.value] || msg['error-technical'])
  }
  if (mode.value !== 'login') {
    refreshCaptcha()
    captcha.value = ''
  }
}

async function doLogin() {
  const params = new URLSearchParams()
  params.append('username', username.value.toLowerCase())
  params.append('password', password.value)

  let resp
  try {
    resp = await fetch('login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Ask for JSON so Spring Security skips its default 302-redirect to
        // the login page (which we'd otherwise follow and parse as HTML).
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: params,
      credentials: 'include',
    })
  } catch (e) {
    console.error('[login] network error', e)
    pushToast('error', msg['error-network'])
    return
  }

  let data = null
  try {
    data = await resp.json()
  } catch {
    /* non-JSON body (e.g. HTML after a backend redirect) → treat as failure */
  }

  // Anything that's not an explicit `{success: true}` is a failure.
  if (!resp.ok || data?.success !== true) {
    handleError(resp.status, data)
    return
  }
  pushToast('success', msg['success-login'])
  // Stay inside the SPA: refresh the session then route to the dashboard.
  try { await auth.fetchSession() } catch { /* ignore */ }
  router.push('/')
}

async function doReset() {
  const resp = await fetch('rest/service/password/reset/' + encodeURIComponent(username.value.toLowerCase()), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'captcha': captcha.value,
    },
    body: JSON.stringify({ password: password.value, token: token.value }),
    credentials: 'include',
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => null)
    handleError(resp.status, body)
    return
  }
  pushToast('success', msg['success-reset'])
  setTimeout(() => switchMode('login'), 2000)
}

async function doRecovery() {
  const resp = await fetch('rest/service/password/recovery/' + encodeURIComponent(username.value.toLowerCase()) + '/' + encodeURIComponent(mail.value.toLowerCase()), {
    method: 'POST',
    headers: { 'captcha': captcha.value },
    credentials: 'include',
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => null)
    handleError(resp.status, body)
    return
  }
  pushToast('success', msg['success-recovery'])
}

async function submit() {
  if (!validate()) return

  loading.value = true
  clearMessages()
  infoMsg.value = msg.validating
  try {
    if (mode.value === 'login') await doLogin()
    else if (mode.value === 'reset') await doReset()
    else if (mode.value === 'recovery') await doRecovery()
  } catch {
    pushToast('error', msg['error-network'])
  } finally {
    loading.value = false
    infoMsg.value = ''
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value
    document.addEventListener('click', onDocClick)
  }

  // Status flags surfaced by the host on redirect (e.g. ?denied, ?logout).
  const q = route.query
  const REASONS = ['expired', 'unavailable', 'network', 'denied', 'concurrency']
  for (const flag of REASONS) {
    if (flag in q) { pushToast('error', msg['error-' + flag]); return }
  }
  if ('logout' in q) { pushToast('success', msg['success-logout']); return }

  // Deep-links from recovery mails. The legacy app read these from the raw
  // URL hash, but vue-router owns the hash here — read them from the query
  // instead: ?reset=<token>/<user> and ?recovery[=<user>].
  const resetParam = typeof q.reset === 'string' ? q.reset : ''
  const resetMatch = resetParam.match(/^([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)$/)
  if (resetMatch) {
    token.value = resetMatch[1]
    username.value = resetMatch[2]
    mode.value = 'reset'
    refreshCaptcha()
    infoMsg.value = msg['message-reset']
    return
  }

  if ('recovery' in q) {
    if (typeof q.recovery === 'string' && q.recovery) username.value = q.recovery
    mode.value = 'recovery'
    refreshCaptcha()
    infoMsg.value = msg['message-recovery']
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
/* ===== 2026 "Vibrant" login — theme-adaptive (follows the active Vuetify
   preset, light or dark). No hard-coded palette: every colour derives from
   --v-theme-* so the page matches the rest of app-ui-2026. ===== */
* { box-sizing: border-box; }

.login-bg {
  --surface: rgb(var(--v-theme-surface));
  --bg: rgb(var(--v-theme-background));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .62);
  --ink-3: rgba(var(--v-theme-on-surface), .45);
  --border: rgba(var(--v-theme-on-surface), .14);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --input-bg: rgba(var(--v-theme-on-surface), .03);
  --accent: rgb(var(--v-theme-secondary));   /* warm Vibrant accent */
  --primary: rgb(var(--v-theme-primary));
  --ok: rgb(var(--v-theme-success));
  --err: rgb(var(--v-theme-error));
  --info: rgb(var(--v-theme-info));
  --warn: rgb(var(--v-theme-warning));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --sys: var(--v26-sys, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  /* Brand aurora colours (logo orange + coral + blue), fixed for a premium,
     vivid pre-auth backdrop in both light and dark. */
  --c-orange: #ff9436;
  --c-coral: #ff5a52;
  --c-blue: #2f6df6;

  position: fixed;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(620px 420px at 6% -6%, color-mix(in srgb, var(--c-orange) 42%, transparent), transparent 60%),
    radial-gradient(520px 360px at 26% 16%, color-mix(in srgb, var(--c-coral) 26%, transparent), transparent 58%),
    radial-gradient(720px 480px at 100% 2%, color-mix(in srgb, var(--c-blue) 40%, transparent), transparent 60%),
    radial-gradient(560px 460px at 92% 104%, color-mix(in srgb, var(--c-blue) 26%, transparent), transparent 58%),
    var(--bg);
  font-family: var(--sys);
  color: var(--ink);
}
/* drifting aurora blobs (orange / coral / blue) */
.aurora { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.aurora .b { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .55; }
.aurora .b1 { width: 460px; height: 460px; background: var(--c-orange); top: -160px; left: -120px; animation: blob1 15s ease-in-out infinite; }
.aurora .b2 { width: 360px; height: 360px; background: var(--c-coral); top: 38%; left: -150px; opacity: .4; animation: blob3 17s ease-in-out infinite; }
.aurora .b3 { width: 540px; height: 540px; background: var(--c-blue); bottom: -200px; right: -150px; animation: blob2 19s ease-in-out infinite; }
@keyframes blob1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(70px,46px) scale(1.12); } }
@keyframes blob2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-54px,-40px) scale(1.08); } }
@keyframes blob3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(46px,-40px) scale(1.1); } }

/* Neon halo around the login card — flowing orange→coral→blue gradient with
   a crisp glowing line + a soft outer bloom, gently pulsing. */
.card-wrap { position: relative; z-index: 1; width: 100%; max-width: 420px; }
.card-wrap::before, .card-wrap::after {
  content: ""; position: absolute; inset: -2px; border-radius: 26px; z-index: 0; pointer-events: none;
  background: linear-gradient(120deg, var(--c-orange), var(--c-coral), var(--c-blue), var(--c-orange));
  background-size: 300% 300%;
  animation: neonFlow 7s ease-in-out infinite, neonPulse 3.2s ease-in-out infinite;
}
.card-wrap::before { filter: blur(4px); opacity: .9; }            /* crisp neon line */
.card-wrap::after { inset: -10px; filter: blur(26px); opacity: .55; } /* outer bloom */
@keyframes neonFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes neonPulse { 0%, 100% { opacity: .55; } 50% { opacity: .9; } }
.card-wrap > .card { width: 100%; max-width: none; }

.card {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  /* Premium: neutral drop + faint warm & cool colour bloom around the card. */
  box-shadow: 0 30px 70px -30px rgba(0, 0, 0, .45), 0 8px 60px -20px rgba(255, 148, 54, .25), 0 8px 60px -20px rgba(47, 109, 246, .22);
  overflow: hidden;
  animation: rise .5s cubic-bezier(.2,.7,.3,1);
}
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.card-head {
  position: relative;
  padding: 30px 28px 6px;
  text-align: center;
}

.locale-sel { position: absolute; top: 14px; right: 14px; z-index: 5; }
.locale-btn { display: flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--ink-2); font-family: var(--sys); font-size: .82rem; font-weight: 600; cursor: pointer; transition: border-color .15s; }
.locale-btn:hover { border-color: var(--border-2); }
.lflag { font-size: 15px; line-height: 1; }
.lcaret { color: var(--ink-3); font-size: .7rem; transition: transform .2s; }
.locale-sel.open .lcaret { transform: rotate(180deg); }
.locale-menu { position: absolute; top: calc(100% + 6px); right: 0; min-width: 156px; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; box-shadow: 0 16px 36px -14px rgba(0,0,0,.3); padding: 5px; animation: lmenu .12s ease; }
@keyframes lmenu { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.locale-opt { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 0; background: transparent; border-radius: 8px; color: var(--ink); font-family: var(--sys); font-size: .85rem; font-weight: 600; cursor: pointer; text-align: left; }
.locale-opt:hover { background: var(--hover); }
.locale-opt.sel { color: var(--accent); }
.llabel { white-space: nowrap; }
.lok { margin-left: auto; color: var(--accent); font-weight: 800; }

.logo { width: 52px; height: 52px; animation: floatY 4.5s ease-in-out infinite; filter: drop-shadow(0 2px 6px rgba(0,0,0,.25)); }
@keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }

.subtitle {
  font-family: var(--font); font-weight: 800; letter-spacing: -.03em;
  font-size: 1.45rem; color: var(--ink); margin: 14px 0 0;
}

.card-body { padding: 18px 28px 26px; flex: 1 1 auto; overflow-y: auto; }

/* staggered reveal of form pieces */
.card-body > .alert, .field, .submit, .links { opacity: 0; animation: fadeUp .5s cubic-bezier(.2,.7,.3,1) forwards; }
.field:nth-of-type(1) { animation-delay: .08s; }
.field:nth-of-type(2) { animation-delay: .15s; }
.field:nth-of-type(3) { animation-delay: .22s; }
.field:nth-of-type(4) { animation-delay: .29s; }
.submit { animation-delay: .30s; }
.links { animation-delay: .38s; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.alert { margin: 0 0 16px; padding: 11px 13px; border-radius: 11px; font-size: .9rem; border: 1px solid transparent; }
.alert-info { background: rgba(var(--v-theme-info), .12); color: var(--info); border-color: rgba(var(--v-theme-info), .35); }

.field { display: block; margin-bottom: 14px; }
.label { display: block; margin-bottom: 6px; font-size: .82rem; font-weight: 700; color: var(--ink-2); }

input[type="text"], input[type="password"], input[type="email"] {
  width: 100%; padding: 11px 13px; font-size: 1rem;
  border: 1px solid var(--border); border-radius: 11px; background: var(--input-bg); color: var(--ink);
  transition: border-color .15s, box-shadow .15s, background .15s; font-family: var(--sys);
}
input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px rgba(var(--v-theme-secondary), .18); background: var(--surface); }
input:disabled, input[readonly] { background: var(--hover); color: var(--ink-3); }

.input-wrap { position: relative; display: block; }
.toggle { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 6px 8px; color: var(--ink-3); line-height: 0; display: inline-flex; }
.toggle:hover { color: var(--accent); }
.toggle-icon { display: block; }

.field-hint { display: block; margin-top: 5px; font-size: .8rem; color: var(--ink-3); }
.field-error { display: block; margin-top: 5px; font-size: .8rem; font-weight: 600; color: var(--err); }

.captcha-field { margin-top: 4px; }
.captcha-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.captcha-img { border: 1px solid var(--border); border-radius: 9px; height: 42px; min-width: 150px; cursor: pointer; background: #fff; }
.icon-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 9px; width: 34px; height: 34px; font-size: 1rem; cursor: pointer; color: var(--ink-2); }
.icon-btn:hover { background: var(--hover); }

.submit {
  position: relative; overflow: hidden;
  width: 100%; padding: 13px; font-family: var(--font); font-size: 1rem; font-weight: 800; color: #fff;
  /* Same warm orange→coral brand gradient as the "Nouvel utilisateur" CTA. */
  background: linear-gradient(135deg, #ff9436, #ff5a52); border: none; border-radius: 12px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 14px 28px -12px rgba(255, 90, 82, .6); transition: filter .15s; margin-top: 4px;
}
.submit:hover:not(:disabled) { filter: brightness(1.06); }
.submit:disabled { opacity: .65; cursor: not-allowed; }
.submit::after {
  content: ""; position: absolute; top: 0; left: -60%; width: 42%; height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent); transform: skewX(-20deg);
  animation: shine 3.6s ease-in-out infinite;
}
@keyframes shine { 0% { left: -60%; } 45%, 100% { left: 150%; } }

.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.45); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.links { margin-top: 14px; text-align: center; }
.link { background: none; border: none; color: var(--accent); font-family: var(--sys); font-weight: 700; font-size: .9rem; cursor: pointer; padding: 4px 8px; }
.link:hover { text-decoration: underline; }

/* -------- toast snackbar stack -------- */
.toast-stack { position: fixed; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 100; pointer-events: none; max-width: calc(100vw - 32px); }
.toast { pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; min-width: 260px; max-width: 420px; padding: 12px 14px; border-radius: 12px; font-size: .9rem; font-weight: 600; box-shadow: 0 12px 30px -10px rgba(0,0,0,.4); color: #fff; animation: toast-in .18s ease-out; }
.toast-message { flex: 1 1 auto; line-height: 1.35; }
.toast-close { flex: 0 0 auto; background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 0 2px; opacity: .85; }
.toast-close:hover { opacity: 1; }
.toast--error { background: var(--err); }
.toast--success { background: var(--ok); }
.toast--info { background: var(--info); }
.toast--warning { background: var(--warn); }
@keyframes toast-in { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .aurora .b, .card-wrap::before, .card-wrap::after, .logo, .submit::after, .card, .card-body > .alert, .field, .submit, .links { animation: none; }
  .card, .card-body > .alert, .field, .submit, .links { opacity: 1; }
}
</style>
