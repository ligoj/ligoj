<template>
  <v-app>
    <v-main class="login-bg d-flex align-center justify-center">
      <v-card width="420" elevation="8" rounded="lg" class="pa-4">
        <v-card-text class="text-center pb-0">
          <img src="@/assets/ligoj.svg" alt="Ligoj" style="width: 48px; height: 48px" />
          <h1 class="text-h5 font-weight-bold mt-2 mb-1" style="color: #1a237e">Ligoj</h1>
          <p class="text-subtitle-2 text-medium-emphasis mb-2">{{ msg['title-' + mode] }}</p>
        </v-card-text>

        <v-card-text>
          <v-alert v-if="infoMsg" type="info" variant="tonal" density="compact" class="mb-4">
            {{ infoMsg }}
          </v-alert>
          <v-alert v-if="successMsg" type="success" variant="tonal" density="compact" class="mb-4">
            {{ successMsg }}
          </v-alert>
          <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4" data-test="error-alert">
            {{ errorMsg }}
          </v-alert>

          <v-form ref="formRef" @submit.prevent="submit">
            <!-- Username -->
            <v-text-field
              v-model="username"
              :label="msg.username"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              :autofocus="mode !== 'reset'"
              autocomplete="username"
              :disabled="mode === 'reset'"
              :readonly="mode === 'reset'"
              :rules="mode !== 'reset' ? [rules.required] : []"
              class="mb-2"
              data-test="username"
            />

            <!-- Password (login + reset) -->
            <v-text-field
              v-if="mode !== 'recovery'"
              v-model="password"
              :label="mode === 'reset' ? msg.newPassword : msg.password"
              prepend-inner-icon="mdi-lock"
              :type="showPwd ? 'text' : 'password'"
              :append-inner-icon="showPwd ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPwd = !showPwd"
              variant="outlined"
              autocomplete="current-password"
              :rules="[rules.required, ...(mode === 'reset' ? [rules.passwordStrength] : [])]"
              :hint="mode === 'reset' ? msg.helpPassword : ''"
              persistent-hint
              class="mb-2"
              data-test="password"
            />

            <!-- Confirm Password (reset only) -->
            <v-text-field
              v-if="mode === 'reset'"
              v-model="passwordConfirm"
              :label="msg.passwordConfirm"
              prepend-inner-icon="mdi-lock-check"
              :type="showPwd ? 'text' : 'password'"
              variant="outlined"
              autocomplete="new-password"
              :rules="[rules.required, rules.passwordMatch]"
              class="mb-2"
            />

            <!-- Email (recovery only) -->
            <v-text-field
              v-if="mode === 'recovery'"
              v-model="mail"
              :label="msg.mail"
              prepend-inner-icon="mdi-email"
              type="email"
              variant="outlined"
              :rules="[rules.required]"
              class="mb-2"
            />

            <!-- CAPTCHA (reset + recovery) -->
            <div v-if="mode !== 'login'" class="mb-4">
              <div class="d-flex align-center mb-2">
                <img
                  :src="captchaSrc"
                  alt="CAPTCHA"
                  class="captcha-img rounded"
                  @click="refreshCaptcha"
                  style="cursor: pointer; height: 40px"
                />
                <v-btn icon size="small" variant="text" class="ml-2" @click="refreshCaptcha">
                  <v-icon>mdi-refresh</v-icon>
                </v-btn>
              </div>
              <v-text-field
                v-model="captcha"
                :label="msg.captcha"
                prepend-inner-icon="mdi-shield-key"
                variant="outlined"
                :rules="[rules.required]"
                :hint="msg.helpCaptcha"
                persistent-hint
                density="compact"
              />
            </div>

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="loading"
              data-test="submit"
            >{{ msg['submit-' + mode] }}</v-btn>
          </v-form>

          <!-- Mode switch links -->
          <div class="text-center mt-4">
            <v-btn
              v-if="mode === 'login'"
              variant="text"
              size="small"
              @click="switchMode('recovery')"
            >{{ msg.recover }}</v-btn>
            <v-btn
              v-if="mode !== 'login'"
              variant="text"
              size="small"
              @click="switchMode('login')"
            >{{ msg.back }}</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

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

function refreshCaptcha() {
  captchaSrc.value = 'captcha.png?' + Date.now()
}

const rules = {
  required: v => !!v || msg.required,
  passwordStrength: v => {
    if (!v) return true
    return (/[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) && v.length >= 8) || msg['password-weak']
  },
  passwordMatch: v => v === password.value || msg['password-mismatch'],
}

function clearMessages() {
  errorMsg.value = ''
  infoMsg.value = ''
  successMsg.value = ''
}

function switchMode(newMode) {
  clearMessages()
  mode.value = newMode
  captcha.value = ''
  password.value = ''
  passwordConfirm.value = ''
  if (newMode !== 'login') {
    refreshCaptcha()
    infoMsg.value = msg['message-' + newMode] || ''
  }
  // Update URL hash
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
  const { valid } = await formRef.value.validate()
  if (!valid) return

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
    if (!successMsg.value) infoMsg.value = ''
    else infoMsg.value = ''
  }
}

onMounted(() => {
  const hash = window.location.hash || ''
  const search = window.location.search || ''

  // Check for reset token: #reset=TOKEN/USERNAME
  const resetMatch = hash.match(/#reset=([a-zA-Z0-9\-]+)\/([a-zA-Z0-9\-]+)/)
  if (resetMatch) {
    token.value = resetMatch[1]
    username.value = resetMatch[2]
    mode.value = 'reset'
    refreshCaptcha()
    infoMsg.value = msg['message-reset']
    return
  }

  // Check for recovery: #recovery=USERNAME or #recovery
  const recoveryMatch = hash.match(/#recovery(=([a-zA-Z0-9\-]+))?/)
  if (recoveryMatch) {
    if (recoveryMatch[2]) username.value = recoveryMatch[2]
    mode.value = 'recovery'
    refreshCaptcha()
    infoMsg.value = msg['message-recovery']
    return
  }

  // Check for query string messages
  if (search.includes('concurrency')) {
    errorMsg.value = msg['error-concurrency']
  } else if (search.includes('logout')) {
    successMsg.value = msg['success-logout']
  }
})
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
}
.captcha-img {
  border: 1px solid #ccc;
  min-width: 150px;
  height: 40px;
}
</style>
