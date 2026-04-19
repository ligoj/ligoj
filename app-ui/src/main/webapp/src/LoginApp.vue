<template>
  <main class="login-bg">
    <section class="card">
      <header class="card-head">
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
                {{ showPwd ? '\u{1F648}' : '\u{1F441}' }}
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
import { ref, reactive, onMounted } from 'vue'

const isFr = (navigator.language || '').startsWith('fr')

const msg = reactive(isFr ? {
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
} : {
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
})

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
  min-height: 100vh;
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
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.card-head {
  padding: 24px 24px 0;
  text-align: center;
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
  font-size: 1rem;
  padding: 6px 8px;
  color: #666;
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
