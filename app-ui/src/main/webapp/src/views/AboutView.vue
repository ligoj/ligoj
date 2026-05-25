<template>
  <div>
    <h1 class="text-h4 mb-6 d-flex align-center ga-3">
      <img :src="ligojLogo" alt="" class="ligoj-title-logo" />
      <span>{{ t('about.title', { name: appName }) }}</span>
    </h1>

    <v-row>
      <v-col cols="12" md="6">
        <v-row>
          <v-col cols="12" md="12">
            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-information</v-icon>
                {{ t('about.app') }}
              </v-card-title>
              <v-card-text>
                <v-table density="compact">
                  <tbody>
                    <tr>
                      <td class="font-weight-medium">{{ t('about.version') }}</td>
                      <td>{{ auth.appSettings.buildVersion || '-' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-medium">{{ t('about.buildDate') }}</td>
                      <td>{{ buildDate }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-medium">{{ t('about.buildNumber') }}</td>
                      <td>{{ auth.appSettings.buildNumber || '-' }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="12">

            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-monitor-dashboard</v-icon>
                {{ t('about.frontend') }}
              </v-card-title>
              <v-card-text>
                <v-table density="compact">
                  <tbody>
                    <tr>
                      <td class="font-weight-medium">{{ t('about.framework') }}</td>
                      <td>Vue 3 + Vuetify 4</td>
                    </tr>
                    <tr>
                      <td class="font-weight-medium">{{ t('about.buildTool') }}</td>
                      <td>Vite 8</td>
                    </tr>
                    <tr>
                      <td class="font-weight-medium">{{ t('about.state') }}</td>
                      <td>Pinia 3</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="12">

            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-bookshelf</v-icon>
                {{ t('about.resources') }}
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item to="/api" link>
                    <template #prepend><v-icon>mdi-api</v-icon></template>
                    <v-list-item-title>{{ t('about.api') }}</v-list-item-title>
                    <v-list-item-subtitle>{{ t('about.apiHint') }}</v-list-item-subtitle>
                    <template #append><v-icon size="small">mdi-chevron-right</v-icon></template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-source-branch</v-icon>
            {{ t('about.project') }}
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item href="https://github.com/ligoj/ligoj" target="_blank" rel="noopener noreferrer">
                <template #prepend><v-icon>mdi-github</v-icon></template>
                <v-list-item-title>{{ t('about.github') }}</v-list-item-title>
                <v-list-item-subtitle>github.com/ligoj/ligoj</v-list-item-subtitle>
                <template #append><v-icon size="small">mdi-open-in-new</v-icon></template>
              </v-list-item>
              <v-list-item @click="licenseDialog = true">
                <template #prepend><v-icon>mdi-license</v-icon></template>
                <v-list-item-title>{{ t('about.license') }}</v-list-item-title>
                <v-list-item-subtitle>MIT</v-list-item-subtitle>
                <template #append><v-icon size="small">mdi-chevron-right</v-icon></template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>


    </v-row>

    <!-- MIT license dialog. The license text is small enough to inline as
         a constant — pulling it from the deployed JAR's LICENSE file
         would need a backend round-trip the About view doesn't currently
         make. `scrollable` keeps the dialog body within the viewport on
         shorter screens. -->
    <v-dialog v-model="licenseDialog" max-width="720" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <img :src="ligojLogo" alt="" class="ligoj-dialog-logo" />
          <v-icon>mdi-license</v-icon>
          <span>Ligoj — {{ t('about.license') }} (MIT)</span>
        </v-card-title>
        <v-card-text>
          <pre class="ligoj-license">{{ licenseText }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="licenseDialog = false">{{ t('common.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'
// Vite resolves this to a hashed URL at build time and a dev-server URL
// at run time — works in both modes without hard-coding `/ligoj/...`.
// Same asset the sidebar brand uses (AppLayout.vue).
import ligojLogo from '@/assets/ligoj.svg'

const auth = useAuthStore()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const licenseDialog = ref(false)

/**
 * Display name. Sourced from the backend's `ApplicationSettings#name`
 * (driven by the `ligoj.name` Spring property); falls back to "Ligoj"
 * when the session hasn't loaded yet or the backend pre-dates the field.
 * Threaded into the page title, license dialog header, and the
 * copyright line of the inlined MIT text below.
 */
const appName = computed(() => auth.appSettings?.name || 'Ligoj')

/* MIT license inlined verbatim — kept here so the About view doesn't
 * have to fetch the LICENSE file from the backend (and so the dialog
 * works offline / in the dev server). Mirrors the repo's root LICENSE
 * with one substitution: the copyright line uses `${appName}` so a
 * rebranded deployment sees its own name. The repo LICENSE itself is
 * not regenerated from this — change both in lockstep. */
const LICENSE_TEMPLATE = (name) => `MIT License

Copyright (c) ${name} Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

const licenseText = computed(() => LICENSE_TEMPLATE(appName.value))

const buildDate = computed(() => {
  const ts = auth.appSettings.buildTimestamp
  if (!ts) return '-'
  return new Date(Number(ts)).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
})

onMounted(() => {
  appStore.setBreadcrumbs([
    { title: t('nav.home'), to: '/' },
    { title: t('nav.about') },
  ])
})
</script>

<style scoped>
/* Monospaced + wrapped license text. `pre` defaults to no-wrap, which
 * would give horizontal scrolling for the long all-caps disclaimer line
 * inside the dialog body. */
.ligoj-license {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

/* Brand logo next to the page title and dialog header. Sized to match
 * the inherited text height so the baseline reads cleanly with the
 * `<h1 class="text-h4">` and the dialog's `<v-card-title>`. */
.ligoj-title-logo {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.ligoj-dialog-logo {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}
</style>
