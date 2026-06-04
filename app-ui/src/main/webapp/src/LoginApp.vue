<!--
  LoginApp2026 — 2026 "Vibrant" re-skin of the login screen.

  PILOT of the UI 2026 redesign (feature/ui-2026). The <template> and
  <script setup> are DUPLICATED verbatim from LoginApp.vue so all the
  real behaviour is preserved (login / recovery / reset modes, CAPTCHA,
  field validation, toasts, OIDC short-circuit, locale switch). Only the
  <style> is reworked to the Vibrant design. The original LoginApp.vue is
  left untouched and remains the default login served by the backend;
  this variant is reachable via its own Vite entry (login-2026.html).
-->
<template>
  <main class="login-bg">
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
        <img src="@/assets/logo.svg" alt="Ligoj" class="logo" />
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
import { ref, reactive, computed, onMounted } from 'vue'

const LOCALES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' /* 🇬🇧 */ },
  { code: 'fr', label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' /* 🇫🇷 */ },
]

/** MDI path data inlined so the login bundle stays small — pulling
 *  @mdi/font in just for these two glyphs would add ~400 kB. Sourced
 *  verbatim from `mdi-eye-outline` and `mdi-eye-off-outline`. */
const PATH_EYE = 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z'
const PATH_EYE_OFF = 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z'

/** Same storage key the main app's vue-i18n uses, so a locale picked
 *  on the login screen is honoured by the host once the user is in. */
const LOCALE_STORAGE_KEY = 'ligoj-locale'

function readSavedLocale() {
  try { return localStorage.getItem(LOCALE_STORAGE_KEY) } catch { return null }
}

function detectLocale() {
  const saved = readSavedLocale()
  if (saved && MESSAGES[saved]) return saved
  return (navigator.language || '').startsWith('fr') ? 'fr' : 'en'
}

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

const locale = ref(detectLocale())

/**
 * `msg` is a `reactive` object (NOT a `computed` ref) so plain
 * `msg['error-denied']` works the same in `<script setup>` JS as it
 * does in the template. A computed ref would only auto-unwrap inside
 * templates; in script code `msg['x']` would return `undefined` and
 * downstream guards (`if (!message) return` in pushToast) would
 * silently swallow every notification — that's the bug behind the
 * "no banner appears after a redirect" report.
 */
const msg = reactive({ ...MESSAGES[locale.value] })

function setLocale(loc) {
  if (!MESSAGES[loc]) return
  locale.value = loc
  // Replace every key with the new locale's value. EN and FR share the
  // same key set so a plain Object.assign is enough.
  Object.assign(msg, MESSAGES[loc])
  try { localStorage.setItem(LOCALE_STORAGE_KEY, loc) } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = loc
  }
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
 * Floating snackbars used for errors and one-shot successes (login OK,
 * password reset OK, recovery sent, logout). The inline `infoMsg`
 * stays for contextual mode-switch help that should remain pinned to
 * the form (message-reset / message-recovery).
 */
const toasts = ref([])
let toastSeq = 0

function pushToast(severity, message, ms = 6000) {
  if (!message) return
  const id = ++toastSeq
  toasts.value.push({ id, severity, message })
  if (ms > 0) {
    setTimeout(() => dismissToast(id), ms)
  }
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
  if (newMode === 'recovery') {
    window.location.hash = '#recovery' + (username.value ? '=' + encodeURIComponent(username.value) : '')
  } else if (newMode === 'login') {
    window.location.hash = ''
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
        // Ask the backend for JSON explicitly so it skips the
        // 302-redirect-to-login-page that Spring Security's form login
        // does by default. Without this we follow the redirect and end
        // up parsing HTML, which used to look like a successful login
        // and trigger a page reload.
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

  // Treat anything that's not an explicit `{success: true}` payload as a
  // failure. That covers HTTP errors (4xx/5xx), backend redirects whose
  // followed response is HTML, and explicit `{success: false}`.
  if (!resp.ok || data?.success !== true) {
    handleError(resp.status, data)
    return
  }
  pushToast('success', msg['success-login'])
  window.location.href = 'index.html'
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
  setTimeout(() => { window.location.href = 'login.html' }, 2000)
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

onMounted(async () => {
  // Reflect the active locale on <html lang> for accessibility / spell-check.
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value
    document.addEventListener('click', onDocClick)
  }

  const hash = window.location.hash || ''
  const search = window.location.search || ''
  const params = new URLSearchParams(search)

  // CRITICAL: handle error / status flags BEFORE the OIDC bounce probe.
  // If we landed here as the failure URL of an OAuth round-trip
  // (`/login.html?denied`) and we then probe `/rest/session`, Spring
  // returns either `opaqueredirect` or a `401 + x-redirect` that
  // points at `/oauth2/authorization/<client>` — which would bounce
  // us straight back into the IdP flow that just failed. Cue an
  // infinite redirect loop and a "too many redirects" browser error.
  // The presence of an error / logout flag means the SPA has been
  // intentionally routed here to display feedback; surface it and
  // STOP. The user can manually retry from the form.
  const REASONS = ['expired', 'unavailable', 'network', 'denied', 'concurrency']
  for (const flag of REASONS) {
    if (params.has(flag) || search.includes(flag)) {
      pushToast('error', msg['error-' + flag])
      return
    }
  }
  if (params.has('logout') || search.includes('logout')) {
    pushToast('success', msg['success-logout'])
    return
  }

  // OIDC short-circuit. With `security=OAuth2Bff`, this page must
  // never be shown on manual navigation or post-logout redirects.
  // Probe `/rest/session`:
  //   - opaqueredirect → Spring sent a literal 302 to the OAuth entry.
  //   - 401 + `x-redirect` containing `/oauth2/authorization/` →
  //     same intent, expressed XHR-friendly by Spring's
  //     RestRedirectStrategy. Treat both as "OIDC mode".
  //   - ok → already authenticated.
  //   - else (plain 401) → standard provider, render the form.
  // In every redirect case we bounce to /ligoj/ and let the SPA boot
  // flow run auth.redirectToLogin(), which does the IdP top-level nav.
  // Network errors fall through so the user sees the form rather than
  // a blank page when the backend is unreachable.
  try {
    const base = import.meta.env.BASE_URL || '/'
    const resp = await fetch(`${base}rest/session`, {
      credentials: 'include',
      redirect: 'manual',
      headers: { Accept: 'application/json' },
    })
    const xRedirect = resp.headers?.get?.('x-redirect') || ''
    const wantsOAuth = xRedirect.includes('/oauth2/authorization/')
    if (resp.type === 'opaqueredirect' || resp.ok || wantsOAuth) {
      window.location.href = base
      return
    }
  } catch { /* network error — render the form */ }

  const resetMatch = hash.match(/#reset=([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)/)
  if (resetMatch) {
    token.value = resetMatch[1]
    username.value = resetMatch[2]
    mode.value = 'reset'
    refreshCaptcha()
    infoMsg.value = msg['message-reset']
    return
  }

  const recoveryMatch = hash.match(/#recovery(=([a-zA-Z0-9-]+))?/)
  if (recoveryMatch) {
    if (recoveryMatch[2]) username.value = recoveryMatch[2]
    mode.value = 'recovery'
    refreshCaptcha()
    infoMsg.value = msg['message-recovery']
    return
  }
})
</script>

<style scoped>
/* ===== 2026 "Vibrant" theme — self-contained (pre-auth page) ===== */
* {
  box-sizing: border-box;
}

.login-bg {
  --bg: #f4f1ec;
  --surface: #fff;
  --border: #e9e3d8;
  --border-2: #ddd5c6;
  --ink: #1c1a17;
  --ink-2: #5a554c;
  --ink-3: #8d877b;
  --ink-4: #b4ad9f;
  --btn1: #ff9436;
  --btn2: #ff5a52;
  --primary: #27348a;
  --ok: #1d9d63;
  --err: #df4d42;
  --info: #2f6df6;
  --warn: #e0901a;
  --font: "Bricolage Grotesque", system-ui, sans-serif;
  --sys: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(700px 420px at 12% 0%, color-mix(in srgb, var(--btn1) 22%, transparent), transparent 55%),
    radial-gradient(700px 480px at 100% 8%, color-mix(in srgb, var(--primary) 28%, transparent), transparent 55%),
    var(--bg);
  font-family: var(--sys);
  color: var(--ink);
}

/* drifting aurora blobs */
.login-bg::before,
.login-bg::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  opacity: .45;
  z-index: 0;
  pointer-events: none;
}

.login-bg::before {
  width: 440px;
  height: 440px;
  background: var(--btn1);
  top: -150px;
  left: -110px;
  animation: blob1 15s ease-in-out infinite;
}

.login-bg::after {
  width: 500px;
  height: 500px;
  background: var(--primary);
  bottom: -190px;
  right: -130px;
  animation: blob2 19s ease-in-out infinite;
}

@keyframes blob1 {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  50% {
    transform: translate(70px, 46px) scale(1.12);
  }
}

@keyframes blob2 {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  50% {
    transform: translate(-54px, -40px) scale(1.08);
  }
}

.card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: 0 30px 70px -30px rgba(28, 26, 23, .45);
  overflow: hidden;
  animation: rise .5s cubic-bezier(.2, .7, .3, 1);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.card-head {
  position: relative;
  padding: 30px 28px 6px;
  text-align: center;
}

.locale-sel {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 5;
}

.locale-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-2);
  font-family: var(--sys);
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .15s;
}

.locale-btn:hover {
  border-color: var(--border-2);
}

.lflag {
  font-size: 15px;
  line-height: 1;
}

.lcaret {
  color: var(--ink-3);
  font-size: .7rem;
  transition: transform .2s;
}

.locale-sel.open .lcaret {
  transform: rotate(180deg);
}

.locale-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 156px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 11px;
  box-shadow: 0 16px 36px -14px rgba(0, 0, 0, .3);
  padding: 5px;
  animation: lmenu .12s ease;
}

@keyframes lmenu {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.locale-opt {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  color: var(--ink);
  font-family: var(--sys);
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.locale-opt:hover {
  background: #faf7f1;
}

.locale-opt.sel {
  color: var(--btn2);
}

.llabel {
  white-space: nowrap;
}

.lok {
  margin-left: auto;
  color: var(--btn2);
  font-weight: 800;
}

.logo {
  width: 52px;
  height: 52px;
  animation: floatY 4.5s ease-in-out infinite;
}

@keyframes floatY {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-7px);
  }
}

.subtitle {
  font-family: var(--font);
  font-weight: 800;
  letter-spacing: -.03em;
  font-size: 1.45rem;
  color: var(--ink);
  margin: 14px 0 0;
}

.card-body {
  padding: 18px 28px 26px;
  flex: 1 1 auto;
  overflow-y: auto;
}

/* staggered reveal of form pieces */
.card-body>.alert,
.field,
.submit,
.links {
  opacity: 0;
  animation: fadeUp .5s cubic-bezier(.2, .7, .3, 1) forwards;
}

.field:nth-of-type(1) {
  animation-delay: .08s;
}

.field:nth-of-type(2) {
  animation-delay: .15s;
}

.field:nth-of-type(3) {
  animation-delay: .22s;
}

.field:nth-of-type(4) {
  animation-delay: .29s;
}

.submit {
  animation-delay: .30s;
}

.links {
  animation-delay: .38s;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.alert {
  margin: 0 0 16px;
  padding: 11px 13px;
  border-radius: 11px;
  font-size: .9rem;
  border: 1px solid transparent;
}

.alert-info {
  background: color-mix(in srgb, var(--info) 10%, var(--surface));
  color: #1b4fd6;
  border-color: color-mix(in srgb, var(--info) 25%, transparent);
}

.field {
  display: block;
  margin-bottom: 14px;
}

.label {
  display: block;
  margin-bottom: 6px;
  font-size: .82rem;
  font-weight: 700;
  color: var(--ink-2);
}

input[type="text"],
input[type="password"],
input[type="email"] {
  width: 100%;
  padding: 11px 13px;
  font-size: 1rem;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: #fdfcfa;
  color: var(--ink);
  transition: border-color .15s, box-shadow .15s, background .15s;
  font-family: var(--sys);
}

input:focus {
  outline: none;
  border-color: var(--btn1);
  box-shadow: 0 0 0 4px rgba(255, 148, 54, .15);
  background: var(--surface);
}

input:disabled,
input[readonly] {
  background: #f3efe7;
  color: var(--ink-3);
}

.input-wrap {
  position: relative;
  display: block;
}

.toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  color: var(--ink-3);
  line-height: 0;
  display: inline-flex;
}

.toggle:hover {
  color: var(--btn2);
}

.toggle-icon {
  display: block;
}

.field-hint {
  display: block;
  margin-top: 5px;
  font-size: .8rem;
  color: var(--ink-3);
}

.field-error {
  display: block;
  margin-top: 5px;
  font-size: .8rem;
  font-weight: 600;
  color: var(--err);
}

.captcha-field {
  margin-top: 4px;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.captcha-img {
  border: 1px solid var(--border);
  border-radius: 9px;
  height: 42px;
  min-width: 150px;
  cursor: pointer;
}

.icon-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  width: 34px;
  height: 34px;
  font-size: 1rem;
  cursor: pointer;
  color: var(--ink-2);
}

.icon-btn:hover {
  background: #faf7f1;
}

.submit {
  position: relative;
  overflow: hidden;
  width: 100%;
  padding: 13px;
  font-family: var(--font);
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, var(--btn1), var(--btn2));
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 14px 28px -12px rgba(255, 90, 82, .7);
  transition: filter .15s;
  margin-top: 4px;
}

.submit:hover:not(:disabled) {
  filter: brightness(1.05);
}

.submit:disabled {
  opacity: .65;
  cursor: not-allowed;
}

.submit::after {
  content: "";
  position: absolute;
  top: 0;
  left: -60%;
  width: 42%;
  height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .4), transparent);
  transform: skewX(-20deg);
  animation: shine 3.6s ease-in-out infinite;
}

@keyframes shine {
  0% {
    left: -60%;
  }

  45%,
  100% {
    left: 150%;
  }
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, .45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.links {
  margin-top: 14px;
  text-align: center;
}

.link {
  background: none;
  border: none;
  color: var(--btn2);
  font-family: var(--sys);
  font-weight: 700;
  font-size: .9rem;
  cursor: pointer;
  padding: 4px 8px;
}

.link:hover {
  text-decoration: underline;
}

/* -------- toast snackbar stack -------- */
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
  pointer-events: none;
  max-width: calc(100vw - 32px);
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 260px;
  max-width: 420px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: .9rem;
  font-weight: 600;
  box-shadow: 0 12px 30px -10px rgba(0, 0, 0, .4);
  color: #fff;
  animation: toast-in .18s ease-out;
}

.toast-message {
  flex: 1 1 auto;
  line-height: 1.35;
}

.toast-close {
  flex: 0 0 auto;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 2px;
  opacity: .85;
}

.toast-close:hover {
  opacity: 1;
}

.toast--error {
  background: var(--err);
}

.toast--success {
  background: var(--ok);
}

.toast--info {
  background: var(--info);
}

.toast--warning {
  background: var(--warn);
}

@keyframes toast-in {
  from {
    transform: translateX(20px);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {

  .login-bg::before,
  .login-bg::after,
  .logo,
  .submit::after,
  .card,
  .card-body>.alert,
  .field,
  .submit,
  .links {
    animation: none;
    opacity: 1;
  }
}
</style>

<!--
  Unscoped: zero out the default html/body margin so .login-bg's 100vh
  fits the viewport exactly (same reset as LoginApp.vue).
-->
<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>
