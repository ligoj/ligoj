<template>
  <main class="login-bg">
    <section class="card">
      <header class="card-head">
        <select
          class="locale-select"
          aria-label="Language"
          :value="locale"
          @change="setLocale($event.target.value)"
        >
          <option
            v-for="loc in LOCALES"
            :key="loc.code"
            :value="loc.code"
          >{{ loc.flag }} {{ loc.label }}</option>
        </select>
        <img src="@/assets/ligoj.svg" alt="Ligoj" class="logo" />
        <h1>Ligoj</h1>
        <p class="subtitle">{{ msg['title-' + mode] }}</p>
      </header>

      <div class="card-body">
        <p v-if="infoMsg" class="alert alert-info">{{ infoMsg }}</p>
        <p v-if="successMsg" class="alert alert-success">{{ successMsg }}</p>
        <p v-if="errorMsg" class="alert alert-error" data-test="error-alert">{{ errorMsg }}</p>

        <form ref="formRef" @submit.prevent="submit" novalidate>
          <label class="field">
            <span class="label">{{ msg.username }}</span>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              :autofocus="mode !== 'reset'"
              :disabled="mode === 'reset'"
              :readonly="mode === 'reset'"
              data-test="username"
              @input="clearFieldError('username')"
            />
            <span v-if="fieldErrors.username" class="field-error">{{ fieldErrors.username }}</span>
          </label>

          <label v-if="mode !== 'recovery'" class="field">
            <span class="label">{{ mode === 'reset' ? msg.newPassword : msg.password }}</span>
            <span class="input-wrap">
              <input
                v-model="password"
                :type="showPwd ? 'text' : 'password'"
                autocomplete="current-password"
                data-test="password"
                @input="clearFieldError('password')"
              />
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
            <input
              v-model="passwordConfirm"
              :type="showPwd ? 'text' : 'password'"
              autocomplete="new-password"
              @input="clearFieldError('passwordConfirm')"
            />
            <span v-if="fieldErrors.passwordConfirm" class="field-error">{{ fieldErrors.passwordConfirm }}</span>
          </label>

          <label v-if="mode === 'recovery'" class="field">
            <span class="label">{{ msg.mail }}</span>
            <input
              v-model="mail"
              type="email"
              @input="clearFieldError('mail')"
            />
            <span v-if="fieldErrors.mail" class="field-error">{{ fieldErrors.mail }}</span>
          </label>

          <div v-if="mode !== 'login'" class="field captcha-field">
            <div class="captcha-row">
              <img
                :src="captchaSrc"
                alt="CAPTCHA"
                class="captcha-img"
                @click="refreshCaptcha"
              />
              <button type="button" class="icon-btn" @click="refreshCaptcha" aria-label="Refresh CAPTCHA">
                &#x21bb;
              </button>
            </div>
            <span class="label">{{ msg.captcha }}</span>
            <input
              v-model="captcha"
              type="text"
              autocomplete="off"
              @input="clearFieldError('captcha')"
            />
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
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const LOCALES = [
  { code: 'en', label: 'English',  flag: '\u{1F1EC}\u{1F1E7}' /* 🇬🇧 */ },
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
    'password-weak': 'Too weak, 8+ uppercase, lowercase and digit chars',
    'password-mismatch': 'Passwords do not match',
  },
}

const locale = ref(detectLocale())
const msg = computed(() => MESSAGES[locale.value])

function setLocale(loc) {
  if (!MESSAGES[loc]) return
  locale.value = loc
  try { localStorage.setItem(LOCALE_STORAGE_KEY, loc) } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = loc
  }
}

const formRef = ref(null)
const mode = ref('login')
const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const mail = ref('')
const captcha = ref('')
const loading = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')
const successMsg = ref('')
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
  errorMsg.value = ''
  infoMsg.value = ''
  successMsg.value = ''
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
        errorMsg.value = msg['error-password-complexity']
      } else if (body.errors.session) {
        errorMsg.value = msg['error-cookie']
      } else {
        errorMsg.value = msg['error-captcha']
      }
    } else {
      errorMsg.value = msg['error-technical']
    }
  } else if (status === 403) {
    errorMsg.value = msg['error-connected']
  } else if (status === 503) {
    errorMsg.value = msg['error-mail']
  } else {
    errorMsg.value = msg['error-' + mode.value] || msg['error-technical']
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
  const resp = await fetch('login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    credentials: 'include',
  })
  const data = await resp.json().catch(() => null)
  if (!resp.ok || (data && !data.success)) {
    handleError(resp.status, data)
    return
  }
  successMsg.value = msg['success-login']
  window.location.href = 'v-index.html'
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
  successMsg.value = msg['success-reset']
  setTimeout(() => { window.location.href = 'v-login.html' }, 2000)
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
  successMsg.value = msg['success-recovery']
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
    errorMsg.value = msg['error-network']
  } finally {
    loading.value = false
    infoMsg.value = ''
  }
}

onMounted(() => {
  // Reflect the active locale on <html lang> for accessibility / spell-check.
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value
  }

  const hash = window.location.hash || ''
  const search = window.location.search || ''

  const resetMatch = hash.match(/#reset=([a-zA-Z0-9\-]+)\/([a-zA-Z0-9\-]+)/)
  if (resetMatch) {
    token.value = resetMatch[1]
    username.value = resetMatch[2]
    mode.value = 'reset'
    refreshCaptcha()
    infoMsg.value = msg['message-reset']
    return
  }

  const recoveryMatch = hash.match(/#recovery(=([a-zA-Z0-9\-]+))?/)
  if (recoveryMatch) {
    if (recoveryMatch[2]) username.value = recoveryMatch[2]
    mode.value = 'recovery'
    refreshCaptcha()
    infoMsg.value = msg['message-recovery']
    return
  }

  if (search.includes('concurrency')) {
    errorMsg.value = msg['error-concurrency']
  } else if (search.includes('logout')) {
    successMsg.value = msg['success-logout']
  }
})
</script>

<style scoped>
* { box-sizing: border-box; }

.login-bg {
  /* Pin to the viewport exactly, not min-height — combined with the
   * unscoped body reset below this prevents the page-level vertical
   * scrollbar that the default 8 px body margin used to produce. */
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  color: #222;
}

.card {
  width: 100%;
  max-width: 420px;
  /* The card may grow tall in reset mode (extra password + captcha
   * fields). Cap it at the viewport and let scrolling happen inside
   * the card body — the outer page never scrolls. */
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.card-head {
  position: relative;
  padding: 24px 24px 0;
  text-align: center;
}

.locale-select {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.8rem;
  color: #333;
  cursor: pointer;
  line-height: 1.4;
  /* Native browser chrome looks fine — no need to style the arrow. */
}
.locale-select:focus {
  outline: none;
  border-color: #1a237e;
  box-shadow: 0 0 0 3px rgba(26, 35, 126, 0.15);
}

.logo {
  width: 48px;
  height: 48px;
}

h1 {
  margin: 8px 0 4px;
  font-size: 1.5rem;
  color: #1a237e;
}

.subtitle {
  margin: 0 0 8px;
  color: #666;
  font-size: 0.9rem;
}

.card-body {
  padding: 16px 24px 24px;
  /* Grows to fill the card and scrolls internally if the form (e.g.
   * reset mode with extra fields) overflows the viewport. */
  flex: 1 1 auto;
  overflow-y: auto;
}

.alert {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  border: 1px solid transparent;
}
.alert-info    { background: #e3f2fd; color: #0277bd; border-color: #b3e5fc; }
.alert-success { background: #e8f5e9; color: #2e7d32; border-color: #c8e6c9; }
.alert-error   { background: #ffebee; color: #c62828; border-color: #ffcdd2; }

.field {
  display: block;
  margin-bottom: 14px;
}

.label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.85rem;
  color: #555;
}

input[type="text"],
input[type="password"],
input[type="email"] {
  width: 100%;
  padding: 10px 12px;
  font-size: 1rem;
  border: 1px solid #bbb;
  border-radius: 6px;
  background: #fff;
  color: #222;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus {
  outline: none;
  border-color: #1a237e;
  box-shadow: 0 0 0 3px rgba(26, 35, 126, 0.15);
}
input:disabled,
input[readonly] {
  background: #f5f5f5;
  color: #888;
}

.input-wrap {
  position: relative;
  display: block;
}
.toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  color: #666;
  line-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.toggle:hover {
  color: #1a237e;
}
.toggle-icon {
  display: block;
}

.field-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: #777;
}
.field-error {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: #c62828;
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
  border: 1px solid #ccc;
  border-radius: 4px;
  height: 40px;
  min-width: 150px;
  cursor: pointer;
}
.icon-btn {
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  font-size: 1rem;
  cursor: pointer;
  color: #555;
}
.icon-btn:hover { background: #f0f0f0; }

.submit {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-weight: 500;
  color: #fff;
  background: #1a237e;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s;
}
.submit:hover:not(:disabled) { background: #0d47a1; }
.submit:disabled { opacity: 0.65; cursor: not-allowed; }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.links {
  margin-top: 12px;
  text-align: center;
}
.link {
  background: none;
  border: none;
  color: #0d47a1;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 4px 8px;
}
.link:hover { text-decoration: underline; }
</style>

<!--
  Unscoped: zero out the default html/body margin so .login-bg's 100vh
  fits the viewport exactly. Without this, the browser adds 8 px of
  body margin and the page gets a vertical scrollbar regardless of
  what we do to the inner layout.
-->
<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>
