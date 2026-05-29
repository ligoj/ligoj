<template>
  <!-- Bound to `auth.authPromptOpen` (driven by `useErrorStore` when an
       API call fails with 401 + body `{redirect: "local"}`). `persistent`
       so the user can't dismiss the dialog by clicking outside — the only
       exits are a successful login or the explicit Cancel button (which
       falls back to the full-page logout flow). -->
  <v-dialog v-model="open" max-width="420" persistent>
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-lock-reset</v-icon>
        <span>{{ t('error.401') }}</span>
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ t('error.401-details') }}
        </p>
        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field v-model="username" :label="t('login.username')" :disabled="loading" autocomplete="username" :rules="[rules.required]" variant="outlined" density="compact" class="mb-2"
            autofocus />
          <v-text-field v-model="password" :label="t('login.password')" :type="showPwd ? 'text' : 'password'" :disabled="loading" autocomplete="current-password" :rules="[rules.required]"
            :append-inner-icon="showPwd ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" @click:append-inner="showPwd = !showPwd" variant="outlined" density="compact" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" :disabled="loading" @click="cancel">{{ t('common.cancel') }}</v-btn>
        <v-spacer />
        <v-btn type="submit" color="primary" :loading="loading" @click="submit">{{ t('login.submit') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useErrorStore } from '@/stores/error.js'
import { useI18nStore } from '@/stores/i18n.js'

const auth = useAuthStore()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

/**
 * Two-way bind on the auth store flag — closing the dialog (via
 * `cancel`) flips it back to false; opening is driven by
 * `useErrorStore.handleResponse` writing the same flag.
 */
const open = computed({
  get: () => auth.authPromptOpen,
  set: (v) => { if (!v) auth.closeAuthPrompt() },
})

const formRef = ref(null)
const username = ref('')
const password = ref('')
const showPwd = ref(false)
const loading = ref(false)

const rules = {
  required: (v) => !!v || t('common.required'),
}

/**
 * Clear inputs every time the dialog is freshly opened. We don't reset
 * on close (the watch fires on every transition) so a momentary close /
 * re-open still starts from a clean slate.
 */
watch(open, (v) => {
  if (v) {
    username.value = ''
    password.value = ''
    showPwd.value = false
    formRef.value?.resetValidation?.()
  }
})

async function submit() {
  const { valid } = formRef.value ? await formRef.value.validate() : { valid: true }
  if (!valid) return
  loading.value = true
  // Match `LoginApp.vue#doLogin` exactly so backend wiring stays
  // single-sourced. Form-urlencoded body + `Accept: application/json`
  // so Spring Security responds with `{success: true|false}` instead
  // of its 302-to-login-page default.
  const params = new URLSearchParams()
  params.append('username', username.value.toLowerCase())
  params.append('password', password.value)
  let resp
  try {
    const base = import.meta.env.BASE_URL || '/'
    resp = await fetch(`${base}login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: params,
      credentials: 'include',
    })
  } catch {
    errorStore.push({ message: t('login.networkError'), status: 0 })
    loading.value = false
    return
  }
  let data = null
  try { data = await resp.json() } catch { /* non-JSON body — treat as failure */ }
  if (!resp.ok || data?.success !== true) {
    errorStore.push({ title: t('login.error'), message: t('login.failed'), status: resp.status })
    password.value = ''
    loading.value = false
    return
  }
  // Success: clear the persistent 401 toast, close the dialog, and
  // reload so any half-loaded view re-fetches with the fresh cookie.
  // The legacy `error.mod.js` flow did the same `location.reload()` —
  // simpler than rerunning every in-flight request and matches user
  // expectations after re-auth.
  errorStore.clear()
  errorStore.success(t('login.submit'))
  auth.closeAuthPrompt()
  loading.value = false
  setTimeout(() => { window.location.reload() }, 300)
}

/**
 * Bail-out path. The session is gone and the user chose not to
 * recover in-place — kick them out to Spring's `/logout`, which
 * lands on the login page (or runs the OIDC end-session flow when
 * applicable). Same behaviour the AppLayout's logout button uses.
 */
function cancel() {
  auth.closeAuthPrompt()
  auth.logout()
}
</script>
