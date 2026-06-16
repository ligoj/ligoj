<!--
  BugReportDialog — front-only "report a bug" helper. Builds a copy/paste
  Markdown template pre-filled with the build version, the current in-app URL
  (path only, no domain) and the installed plugins (all read from the session
  via auth.appSettings — no backend call), then links to the GitHub issue form.

  Chrome mirrors AboutView's License dialog (.lic look): the root re-declares
  its design tokens locally because v-dialog teleports the card to <body>,
  where scoped page vars don't reach.
-->
<template>
  <v-dialog :model-value="modelValue" max-width="680" scrollable @update:model-value="emit('update:modelValue', $event)">
    <div class="bug" :style="{ '--c': '#e0567a' }">
      <header class="bug-head">
        <span class="bug-orb"><v-icon size="20">mdi-bug-outline</v-icon></span>
        <div class="bug-htxt">
          <h3>{{ t('bugReport.title') }}</h3>
          <p>{{ t('bugReport.hint') }}</p>
        </div>
        <button class="bug-x" :aria-label="t('common.close')" @click="close">
          <v-icon size="20">mdi-close</v-icon>
        </button>
      </header>

      <div class="bug-body">
        <textarea ref="taRef" class="bug-template" readonly :value="template" @focus="selectAll" />
      </div>

      <footer class="bug-foot">
        <a class="bug-btn" :href="issueUrl" target="_blank" rel="noopener noreferrer">
          <v-icon size="16">mdi-github</v-icon>{{ t('bugReport.openIssue') }}
          <v-icon size="14" class="bug-go">mdi-open-in-new</v-icon>
        </a>
        <span class="bug-sp" />
        <button class="bug-btn primary" @click="copy">
          <v-icon size="16">{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
          {{ copied ? t('bugReport.copied') : t('bugReport.copy') }}
        </button>
      </footer>
    </div>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore, useI18nStore } from '@ligoj/host'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const auth = useAuthStore()
const { t } = useI18nStore()

const GITHUB_ISSUE_URL = 'https://github.com/ligoj/ligoj/issues/new'

const version = computed(() => auth.appSettings?.buildVersion || t('bugReport.unknown'))

// The in-app location WITHOUT the domain: prefer the hash route (this is a
// hash-router SPA, e.g. "#/about"), else the pathname. Captured into a ref on
// open so it reflects where the user actually was when they hit the button.
const url = ref('')
function captureUrl() {
  if (typeof window === 'undefined') { url.value = ''; return }
  url.value = window.location.hash || window.location.pathname || '/'
}

// appSettings.plugins is a list of backend keys (strings like
// "service:id:ldap"). Stay robust to an object shape too (id/key/name), since
// the exact form is backend-driven — fall back to JSON for anything exotic.
const pluginLines = computed(() => {
  const list = auth.appSettings?.plugins
  if (!Array.isArray(list) || !list.length) return []
  return list.map((p) => {
    if (typeof p === 'string') return p
    if (p && typeof p === 'object') return p.id || p.key || p.name || p.artifact || JSON.stringify(p)
    return String(p)
  })
})

const template = computed(() => {
  const lines = [
    `## ${t('bugReport.tplDescription')}`,
    t('bugReport.tplDescPlaceholder'),
    '',
    `## ${t('bugReport.tplContext')}`,
    `- ${t('bugReport.tplVersion')}: ${version.value}`,
    `- ${t('bugReport.tplUrl')}: ${url.value}`,
    `- ${t('bugReport.tplPlugins')}:`,
  ]
  const plugins = pluginLines.value
  if (plugins.length) lines.push(...plugins.map((p) => `  - ${p}`))
  else lines.push(`  - ${t('bugReport.tplNoPlugin')}`)
  return lines.join('\n')
})

// Pre-fill the GitHub issue body so the user can submit directly; they can
// still copy/paste from the textarea if they prefer.
const issueUrl = computed(() => `${GITHUB_ISSUE_URL}?body=${encodeURIComponent(template.value)}`)

const taRef = ref(null)
const copied = ref(false)
let copiedT

function selectAll() {
  taRef.value?.select?.()
}

async function copy() {
  const text = template.value
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      throw new Error('clipboard API unavailable')
    }
  } catch {
    // Fallback: select the textarea and let the legacy execCommand copy it,
    // leaving the selection visible so the user can Ctrl/Cmd+C manually if
    // even that is blocked.
    const ta = taRef.value
    if (ta) {
      ta.focus()
      ta.select()
      try { document.execCommand('copy') } catch { /* user can copy manually */ }
    }
  }
  copied.value = true
  clearTimeout(copiedT)
  copiedT = setTimeout(() => { copied.value = false }, 2000)
}

function close() { emit('update:modelValue', false) }

// Refresh the captured URL each time the dialog opens.
watch(() => props.modelValue, (open) => {
  if (open) {
    captureUrl()
    copied.value = false
  }
}, { immediate: true })
</script>

<style scoped>
.bug {
  --surface: rgb(var(--v-theme-surface));
  --card: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --hover: rgba(var(--v-theme-on-surface), .06);
  --font: var(--lj-font, var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif));
  --mono: var(--lj-mono, var(--v26-mono, "JetBrains Mono", ui-monospace, monospace));
  --radius: var(--lj-radius, 18px);
  --radius-sm: var(--lj-radius-sm, 12px);
  --shadow-lg: var(--lj-shadow-lg, 0 32px 64px -24px color-mix(in srgb, var(--c) 45%, transparent));
  --border-w: var(--lj-border-width, 1px);
  --border-c: var(--lj-border-color, var(--border));
  --bold: var(--lj-weight-bold, 800);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  max-height: 82vh;
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  border-radius: var(--radius);
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 6%, var(--card)), var(--card));
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.bug-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
.bug-orb { width: 40px; height: 40px; border-radius: var(--radius-sm); flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--c) 65%, transparent); }
.bug-htxt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.bug-htxt h3 { font-family: var(--font); font-weight: var(--bold); font-size: 17px; margin: 0; letter-spacing: -.02em; }
.bug-htxt p { margin: 1px 0 0; font-size: 12px; color: var(--ink-3); font-weight: 600; }
.bug-x { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border: 0; border-radius: var(--lj-radius-sm, 10px); background: transparent; color: var(--ink-3); cursor: pointer; transition: background .14s, color .14s; }
.bug-x:hover { background: var(--hover); color: var(--ink); }

.bug-body { padding: 16px 18px; overflow-y: auto; }
.bug-template {
  width: 100%;
  min-height: 220px;
  resize: vertical;
  box-sizing: border-box;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink);
  background: rgba(var(--v-theme-on-surface), .04);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  white-space: pre;
  overflow: auto;
}
.bug-template:focus { outline: 2px solid color-mix(in srgb, var(--c) 55%, transparent); outline-offset: 1px; }

.bug-foot { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--border); }
.bug-sp { flex: 1; }
.bug-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font);
  font-weight: 700;
  font-size: 13px;
  color: var(--ink);
  text-decoration: none;
  padding: 8px 16px;
  border: var(--border-w) var(--lj-border-style, solid) var(--border-c);
  border-radius: var(--lj-radius-sm, 10px);
  background: transparent;
  cursor: pointer;
  transition: background .14s, border-color .14s;
}
.bug-btn:hover { background: var(--hover); border-color: color-mix(in srgb, var(--c) 35%, var(--border)); }
.bug-btn.primary { color: #fff; border-color: transparent; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); }
.bug-btn.primary:hover { filter: brightness(1.05); }
.bug-go { opacity: .7; }
</style>
