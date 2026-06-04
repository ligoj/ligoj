<!--
  LoginPromptDialog — 2026 "Vibrant" in-place re-authentication. The host's
  error store flips auth.authPromptOpen on a 401 + body {redirect:"local"}
  (session expired mid-use); without this dialog mounted the standalone shell
  just showed a pinned 401 toast and a dead page. This binds to that flag and
  lets the user re-login without losing their place (same POST {base}login flow
  as the Vibrant LoginView), then clears the error queue and reloads. Cancel
  drops to the Vibrant /login. persistent: the only exits are success or Cancel.
-->
<template>
  <v-dialog v-model="open" max-width="440" persistent>
    <v-card class="vmodal">
      <div class="vmodal-head">
        <span class="mi"><v-icon color="#fff">mdi-lock-reset</v-icon></span>
        <h3>{{ t('error.401') || 'Session expirée' }}</h3>
      </div>
      <v-card-text class="vmodal-body">
        <p class="lp-intro">{{ t('error.401-details') || 'Votre session a expiré. Reconnectez-vous pour continuer.' }}</p>
        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field v-model="username" prepend-inner-icon="mdi-account-outline" :label="t('login.username') || 'Identifiant'" :disabled="loading" autocomplete="username" :rules="[rules.required]" variant="outlined" class="mb-2" autofocus />
          <v-text-field v-model="password" prepend-inner-icon="mdi-lock-outline" :label="t('login.password') || 'Mot de passe'" :type="showPwd ? 'text' : 'password'" :disabled="loading" autocomplete="current-password" :rules="[rules.required]"
            :append-inner-icon="showPwd ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" variant="outlined" @click:append-inner="showPwd = !showPwd" @keyup.enter="submit" />
        </v-form>
      </v-card-text>
      <div class="vmodal-foot">
        <button class="mbtn ghost" :disabled="loading" @click="cancel">{{ t('common.cancel') || 'Annuler' }}</button>
        <span class="foot-sp" />
        <button class="mbtn primary" :disabled="loading" @click="submit">
          <span v-if="loading" class="mspin" aria-hidden="true" /><v-icon v-else size="18">mdi-login-variant</v-icon>{{ t('login.submit') || 'Se reconnecter' }}
        </button>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useErrorStore, useI18nStore, APP_BASE } from '@ligoj/host'

const auth = useAuthStore()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t
const router = useRouter()

const open = computed({
  get: () => auth.authPromptOpen,
  set: (v) => { if (!v) auth.closeAuthPrompt() },
})

const formRef = ref(null)
const username = ref('')
const password = ref('')
const showPwd = ref(false)
const loading = ref(false)
const rules = { required: (v) => !!v || (t('common.required') || 'Requis') }

watch(open, (v) => {
  if (v) { username.value = ''; password.value = ''; showPwd.value = false; formRef.value?.resetValidation?.() }
})

async function submit() {
  const { valid } = formRef.value ? await formRef.value.validate() : { valid: true }
  if (!valid) return
  loading.value = true
  // Same wiring as the Vibrant LoginView/core: form-urlencoded + Accept JSON so
  // Spring Security answers {success:true|false} instead of a 302.
  const params = new URLSearchParams()
  params.append('username', username.value.toLowerCase())
  params.append('password', password.value)
  let resp
  try {
    resp = await fetch(`${APP_BASE}login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: params,
      credentials: 'include',
    })
  } catch {
    errorStore.push({ message: t('login.networkError') || 'Erreur réseau', status: 0 })
    loading.value = false
    return
  }
  let data = null
  try { data = await resp.json() } catch { /* non-JSON → failure */ }
  if (!resp.ok || data?.success !== true) {
    errorStore.push({ title: t('login.error') || 'Échec', message: t('login.failed') || 'Identifiants invalides', status: resp.status })
    password.value = ''
    loading.value = false
    return
  }
  errorStore.clear()
  errorStore.success(t('login.submit') || 'Reconnecté')
  auth.closeAuthPrompt()
  loading.value = false
  setTimeout(() => { window.location.reload() }, 300)
}

// Bail-out: session is gone and the user declined to re-auth here → land on the
// Vibrant login (we don't call auth.logout(), which top-level-navigates out of
// the SPA — mirrors App.vue's in-app logout intent).
function cancel() {
  auth.closeAuthPrompt()
  router.push({ path: '/login', query: { logout: null } })
}
</script>

<style scoped>
.vmodal {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-2: rgba(var(--v-theme-on-surface), .72);
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --border-2: rgba(var(--v-theme-on-surface), .26);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  border-radius: 20px !important; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important;
}
.vmodal-head { display: flex; align-items: center; gap: 13px; padding: 22px 24px 6px; }
.vmodal-head .mi { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6); }
.vmodal-head h3 { font-family: var(--font); font-weight: 800; font-size: 20px; margin: 0; flex: 1; color: var(--ink); letter-spacing: -.02em; }
.vmodal-body { padding: 10px 24px 4px !important; }
.lp-intro { margin: 0 0 14px; font-size: 13.5px; color: var(--ink-2); font-weight: 500; line-height: 1.5; }
.vmodal :deep(.v-field) { border-radius: 12px; font-family: var(--font); }
.vmodal :deep(.v-field__prepend-inner .v-icon) { opacity: .55; }
.vmodal-foot { display: flex; align-items: center; gap: 10px; padding: 12px 24px 22px; }
.foot-sp { flex: 1; }
.mbtn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font); font-weight: 700; font-size: 14px; padding: 10px 17px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s, border-color .15s; }
.mbtn.primary { color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); box-shadow: 0 8px 18px -10px rgba(255, 90, 82, .55); }
.mbtn.primary:hover:not(:disabled) { filter: brightness(1.04); }
.mbtn.ghost { color: var(--ink-2); background: transparent; border-color: var(--border); }
.mbtn.ghost:hover:not(:disabled) { background: var(--hover); border-color: var(--border-2); }
.mbtn:disabled { opacity: .6; cursor: default; }
.mspin { width: 15px; height: 15px; border: 2px solid rgba(255, 255, 255, .5); border-top-color: #fff; border-radius: 50%; animation: sspin .7s linear infinite; }
@keyframes sspin { to { transform: rotate(360deg); } }
</style>
