<template>
  <!-- API-key login page — Vue port of the legacy
       `login-by-api-key.html`. Same Spring Security back-end contract
       (POST form-urlencoded `api-user` + `api-key` to
       `/login-by-api-key`, see `ApiKeyLoginFilter`); only the chrome
       changes — Bootstrap-Material-Design / Roboto / FontAwesome are
       gone, replaced with the same brand layout the form-login page
       (`LoginApp.vue`) uses.

       Plain HTML form submission: the backend redirects on both
       success (→ home) and failure (→ /login.html), so the browser
       handles navigation natively. The Vue layer only owns the
       look-and-feel + a brief loading state between submit and
       redirect. -->
  <main class="login-bg">
    <section class="card">
      <header class="card-head">
        <select class="locale-select" aria-label="Language" :value="locale" @change="setLocale($event.target.value)">
          <option v-for="loc in LOCALES" :key="loc.code" :value="loc.code">{{ loc.flag }} {{ loc.label }}</option>
        </select>
        <img src="@/assets/logo.svg" alt="Ligoj" class="logo" />
        <p class="subtitle">{{ msg.title }}</p>
      </header>

      <div class="card-body">
        <!-- The Vue layer does not preventDefault — the form submits
             natively so the browser follows Spring's 302. `loading`
             flips on submit to grey-out the button + spin the icon
             between click and the actual navigation kick-in. -->
        <form action="login-by-api-key" method="post" autocomplete="on" @submit="onSubmit">
          <label class="field">
            <span class="label">{{ msg.apiUser }}</span>
            <input v-model="apiUser" type="text" name="api-user" autocomplete="username" autofocus required />
          </label>

          <label class="field">
            <span class="label">{{ msg.apiKey }}</span>
            <span class="input-wrap">
              <input v-model="apiKey" :type="showKey ? 'text' : 'password'" name="api-key" autocomplete="current-password" required />
              <button type="button" class="toggle" @click="showKey = !showKey" :aria-label="showKey ? 'Hide key' : 'Show key'">
                <svg class="toggle-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path :d="showKey ? PATH_EYE_OFF : PATH_EYE" fill="currentColor" />
                </svg>
              </button>
            </span>
          </label>

          <button type="submit" class="submit" :disabled="loading" data-test="submit">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            {{ msg.submit }}
          </button>
        </form>

        <p class="back">
          <a :href="loginHref">{{ msg.back }}</a>
        </p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const LOCALES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' /* 🇬🇧 */ },
  { code: 'fr', label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' /* 🇫🇷 */ },
]

/* MDI path data inlined so this small page doesn't pull @mdi/font
 * just for two glyphs. Sourced verbatim from `mdi-eye-outline` and
 * `mdi-eye-off-outline`. Identical to the inlined paths in
 * LoginApp.vue. */
const PATH_EYE = 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z'
const PATH_EYE_OFF = 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z'

/* Same key the host's vue-i18n picks up — a locale chosen here is
 * honoured by the SPA once the user is authenticated. */
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
    title: 'Connexion par clé API',
    apiUser: 'Utilisateur API',
    apiKey: 'Clé API',
    submit: 'Se connecter',
    back: '← Connexion classique',
  },
  en: {
    title: 'API key login',
    apiUser: 'API user',
    apiKey: 'API key',
    submit: 'Sign in',
    back: '← Standard sign-in',
  },
}

const locale = ref(detectLocale())
const msg = reactive({ ...MESSAGES[locale.value] })

function setLocale(loc) {
  if (!MESSAGES[loc]) return
  locale.value = loc
  Object.assign(msg, MESSAGES[loc])
  try { localStorage.setItem(LOCALE_STORAGE_KEY, loc) } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = loc
  }
}

const apiUser = ref('')
const apiKey = ref('')
const showKey = ref(false)
const loading = ref(false)

/**
 * Submit-handler shim: we DON'T preventDefault — the form submits
 * natively so the browser follows Spring's 302 redirect (success →
 * SPA home, failure → /login.html). Setting `loading` synchronously
 * gives the user a momentary visual confirmation of the click
 * before the navigation paints over the page.
 */
function onSubmit() {
  loading.value = true
}

/** Link back to the standard form-login page from a small footer. */
const loginHref = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}login.html`
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = locale.value
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.login-bg {
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

.subtitle {
  margin: 0 0 8px;
  color: #666;
  font-size: 0.9rem;
}

.card-body {
  padding: 16px 24px 24px;
  flex: 1 1 auto;
  overflow-y: auto;
}

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
input[type="password"] {
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

.submit:hover:not(:disabled) {
  background: #0d47a1;
}

.submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.back {
  margin: 16px 0 0;
  text-align: center;
}

.back a {
  color: #0d47a1;
  font-size: 0.9rem;
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}
</style>

<!--
  Unscoped: zero out the default html/body margin so .login-bg's 100vh
  fits the viewport exactly. Lifted from LoginApp.vue so the two
  pages render identically.
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
