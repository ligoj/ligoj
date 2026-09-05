<!--
  MfaApp — second factor page, shown right after a successful primary
  authentication (form login, OIDC) when the user registered an MFA device.
  The session is authenticated but flagged "pending" by the backend
  (MfaAuthenticationSuccessHandler); everything but this page is denied until
  `POST login/mfa` validates a code (MfaVerifyFilter). `GET login/mfa` lists
  the user's devices: with several of them, the user picks the one to verify
  with (the default device is preselected), and the input adapts to the method:
  a 6-digit authenticator code, or a passkey prompt (`GET login/mfa/passkey`
  gives the request options, `navigator.credentials.get` answers, the assertion
  is posted). Self-contained like the login
  page: no host, no Vuetify, own messages. The code input deliberately opts
  into `autocomplete="one-time-code"` so the OS can offer the code it just
  received — the only accepted native completion besides the login credentials.
-->
<template>
  <main class="mfa-bg">
    <section class="card">
      <header class="card-head">
        <img src="@/assets/logo.svg" alt="Ligoj" class="logo" />
        <h1 class="title">{{ msg.title }}</h1>
        <p class="subtitle">{{ msg.subtitle }}</p>
      </header>
      <div class="card-body">
        <form @submit.prevent="submit" novalidate>
          <!-- Several devices: choose the one to verify with (default preselected) -->
          <div v-if="devices.length > 1" class="devices" role="radiogroup" :aria-label="msg.selectDevice">
            <span class="label">{{ msg.selectDevice }}</span>
            <button v-for="d in devices" :key="d.id" type="button" class="device" :class="{ on: selected?.id === d.id }" role="radio" :aria-checked="selected?.id === d.id" :disabled="busy" @click="select(d)">
              <span class="dname">{{ d.name }}</span><span class="dtype">{{ msg['type-' + d.type] || d.type }}</span>
            </button>
          </div>
          <template v-if="isPasskey">
            <p class="passkey-text">{{ supported ? msg.passkeyText : msg.passkeyUnsupported }}</p>
            <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
            <button type="button" class="btn" data-test="mfa-passkey" :disabled="busy || !supported" @click="usePasskey">{{ busy ? msg.checking : msg.passkeyButton }}</button>
          </template>
          <template v-else>
            <label class="field">
              <span class="label">{{ msg.code }}</span>
              <input :value="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" autofocus
                data-test="mfa-code" :disabled="busy" @input="onInput" />
              <span class="hint">{{ msg.hint }}</span>
            </label>
            <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
            <!-- A TOTP code is exactly 6 digits: the button waits for them -->
            <button type="submit" class="btn" :disabled="busy || !valid">{{ busy ? msg.checking : msg.verify }}</button>
          </template>
        </form>
        <a class="link" href="logout">{{ msg.cancel }}</a>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { isWebAuthnSupported, toRequestOptions, serializeAssertion } from '@/utils/webauthn.js'

const MESSAGES = {
  en: {
    title: 'Verification', subtitle: 'Confirm your identity with one of your registered devices.', code: 'Code',
    hint: '6 digits, renewed every 30 seconds.',
    passkeyText: 'Confirm with your passkey: Touch ID, Windows Hello, a security key…', passkeyButton: 'Use my passkey',
    passkeyUnsupported: 'This browser does not support passkeys: choose another device.', passkeyFailed: 'The passkey could not be verified.',
    selectDevice: 'Verify with', 'type-TOTP': 'Authenticator app', 'type-PASSKEY': 'Passkey',
    verify: 'Verify', checking: 'Checking…', cancel: 'Cancel and sign out',
    invalid: 'Invalid code ({remaining} attempts left).', locked: 'Too many failed attempts, please sign in again.',
    unauthorized: 'Your session has expired, please sign in again.', network: 'The server cannot be reached.',
  },
  fr: {
    title: 'Vérification', subtitle: 'Confirmez votre identité avec l’un de vos appareils enregistrés.', code: 'Code',
    hint: '6 chiffres, renouvelés toutes les 30 secondes.',
    passkeyText: 'Confirmez avec votre passkey : Touch ID, Windows Hello, une clé de sécurité…', passkeyButton: 'Utiliser ma passkey',
    passkeyUnsupported: 'Ce navigateur ne prend pas en charge les passkeys : choisissez un autre appareil.', passkeyFailed: 'La passkey n’a pas pu être vérifiée.',
    selectDevice: 'Vérifier avec', 'type-TOTP': 'Application d’authentification', 'type-PASSKEY': 'Passkey',
    verify: 'Vérifier', checking: 'Vérification…', cancel: 'Annuler et se déconnecter',
    invalid: 'Code invalide ({remaining} essais restants).', locked: 'Trop d’échecs, veuillez vous reconnecter.',
    unauthorized: 'Votre session a expiré, veuillez vous reconnecter.', network: 'Le serveur est injoignable.',
  },
}
// Same storage key as the login page and the host
function detectLocale() {
  try { const saved = localStorage.getItem('ligoj-locale'); if (saved && MESSAGES[saved]) return saved } catch { /* ignore */ }
  return (navigator.language || '').startsWith('fr') ? 'fr' : 'en'
}
const locale = ref(detectLocale())
const msg = computed(() => MESSAGES[locale.value])
const code = ref('')
const busy = ref(false)
const error = ref('')
const devices = ref([])
const selected = ref(null)
const isPasskey = computed(() => selected.value?.type === 'PASSKEY')
const supported = isWebAuthnSupported()
// A code is complete at 6 digits
const valid = computed(() => /^\d{6}$/.test(code.value))
function onInput(e) {
  // Digits only, at most 6 (keeps pasted "123 456" usable)
  code.value = String(e.target.value || '').replace(/\D/g, '').slice(0, 6)
  e.target.value = code.value
  error.value = ''
}
function select(device) {
  if (selected.value?.id === device.id) return
  selected.value = device
  code.value = ''
  error.value = ''
}
// The devices to choose from, recorded by the backend at the primary authentication
;(async () => {
  try {
    const resp = await fetch('login/mfa', { headers: { Accept: 'application/json' }, credentials: 'include' })
    if (!resp.ok) return
    const data = await resp.json()
    devices.value = Array.isArray(data?.devices) ? data.devices : []
    selected.value = devices.value.find((d) => d.defaultDevice) || devices.value[0] || null
  } catch { /* the page still works with the plain code input */ }
})()

async function submit() {
  if (!valid.value || busy.value) return
  await send({ code: code.value, device: selected.value?.id ?? null })
}

// Passkey: fetch the request options, prompt the authenticator, post the assertion
async function usePasskey() {
  if (busy.value || !supported) return
  busy.value = true
  error.value = ''
  try {
    const optionsResp = await fetch('login/mfa/passkey', { headers: { Accept: 'application/json' }, credentials: 'include' })
    if (!optionsResp.ok) { error.value = msg.value.network; busy.value = false; return }
    const options = await optionsResp.json()
    const credential = await navigator.credentials.get({ publicKey: toRequestOptions(options) })
    if (!credential) { error.value = msg.value.passkeyFailed; busy.value = false; return }
    await send({ device: selected.value?.id ?? null, passkey: serializeAssertion(credential) })
  } catch {
    // Cancelled or rejected by the authenticator
    error.value = msg.value.passkeyFailed
    busy.value = false
  }
}

async function send(payload) {
  busy.value = true
  error.value = ''
  let resp
  try {
    resp = await fetch('login/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(payload),
      credentials: 'include',
    })
  } catch {
    error.value = msg.value.network
    busy.value = false
    return
  }
  if (resp.status === 204) {
    window.location.href = 'index.html'
    return
  }
  let data = null
  try { data = await resp.json() } catch { /* not JSON */ }
  const kind = data?.code
  if (kind === 'mfa-locked') { window.location.href = 'login.html?denied'; return }
  if (kind === 'unauthorized' || resp.status === 403) { window.location.href = 'login.html'; return }
  if (kind === 'mfa-invalid') error.value = msg.value.invalid.replace('{remaining}', String(data.remaining ?? '?'))
  else error.value = msg.value.network
  busy.value = false
}
</script>

<style scoped>
* { box-sizing: border-box; }
.mfa-bg {
  --bg: #f4f1ec; --surface: #fff; --border: #e9e3d8; --ink: #1c1a17; --ink-2: #5a554c; --ink-3: #8d877b;
  --btn1: #ff9436; --btn2: #ff5a52; --primary: #27348a; --err: #df4d42;
  --font: "Bricolage Grotesque", system-ui, sans-serif; --sys: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: radial-gradient(700px 420px at 12% 0%, color-mix(in srgb, var(--btn1) 22%, transparent), transparent 55%),
    radial-gradient(700px 480px at 100% 8%, color-mix(in srgb, var(--primary) 28%, transparent), transparent 55%), var(--bg);
  font-family: var(--sys); color: var(--ink);
}
.card { width: min(420px, 100%); background: var(--surface); border: 1px solid var(--border); border-radius: 22px; box-shadow: 0 30px 60px -30px rgba(0, 0, 0, .35); padding: 30px 30px 26px; }
.card-head { text-align: center; margin-bottom: 22px; }
.logo { height: 42px; margin-bottom: 14px; }
.title { margin: 0 0 6px; font-family: var(--font); font-weight: 800; font-size: 24px; }
.subtitle { margin: 0; color: var(--ink-2); font-size: 14px; line-height: 1.45; }
.devices { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.device { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; text-align: left; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 12px; background: #fff; color: var(--ink); cursor: pointer; font: inherit; }
.device.on { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent); }
.device:disabled { opacity: .6; cursor: default; }
.dname { font-weight: 700; font-size: 14px; }
.dtype { font-size: 11.5px; color: var(--ink-3); }
.field { display: block; margin-bottom: 14px; }
.passkey-text { margin: 0 0 14px; font-size: 14px; line-height: 1.5; color: var(--ink-2); text-align: center; }
.label { display: block; font-size: 12.5px; font-weight: 700; color: var(--ink-2); margin-bottom: 6px; }
.field input { width: 100%; font: 700 24px/1 var(--font); letter-spacing: .28em; text-align: center; padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 12px; background: #fff; color: var(--ink); outline: none; }
.field input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent); }
.hint { display: block; margin-top: 6px; font-size: 12px; color: var(--ink-3); text-align: center; }
.alert { margin: 0 0 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; }
.alert-error { background: color-mix(in srgb, var(--err) 12%, #fff); color: var(--err); border: 1px solid color-mix(in srgb, var(--err) 35%, #fff); }
.btn { width: 100%; border: 0; border-radius: 12px; padding: 13px 16px; font: 700 15px var(--font); color: #fff; cursor: pointer; background: linear-gradient(135deg, var(--btn1), var(--btn2)); box-shadow: 0 14px 28px -14px var(--btn2); }
.btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
.link { display: block; margin-top: 16px; text-align: center; font-size: 13px; color: var(--ink-3); text-decoration: none; }
.link:hover { color: var(--ink); text-decoration: underline; }
</style>
