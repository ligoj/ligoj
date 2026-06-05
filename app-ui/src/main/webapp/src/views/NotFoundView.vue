<!--
  NotFoundView — 2026 "Vibrant" catch-all (router /:pathMatch(.*)*). Replaces
  the blank <router-view> a bad hash used to leave behind with a centred,
  theme-adaptive empty state: big 404 glyph, message, the attempted path and a
  CTA back to the dashboard.
-->
<template>
  <div class="nf lj-surface">
    <div class="nf-card">
      <span class="nf-glyph"><v-icon size="40">mdi-map-marker-question-outline</v-icon><span class="nf-code">404</span></span>
      <h1>{{ t('notFound.title') }}</h1>
      <p class="nf-msg">{{ t('notFound.message') }}</p>
      <code class="nf-path">{{ attempted }}</code>
      <LjButton icon="mdi-home-outline" class="nf-cta" @click="go">{{ t('notFound.back') }}</LjButton>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore, useI18nStore, LjButton } from '@ligoj/host'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const attempted = computed(() => '#' + route.fullPath)
function go() { router.push('/') }

onMounted(() => app.setBreadcrumbs([{ title: t('nav.home'), to: '/' }, { title: t('notFound.title') }]))
</script>

<style scoped>
.nf {
  --ink: rgb(var(--v-theme-on-surface));
  --ink-3: rgba(var(--v-theme-on-surface), .55);
  --border: rgba(var(--v-theme-on-surface), .12);
  --pill: rgba(var(--v-theme-on-surface), .06);
  --accent: rgb(var(--v-theme-secondary));
  --font: var(--lj-font, var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif));
  --mono: var(--lj-mono, var(--v26-mono, "JetBrains Mono", ui-monospace, monospace));
  /* Shape/type from the active style's design tokens (assets/vuetify-overrides.css)
   * so this hand-rolled view re-shapes with the theme, not just recolors.
   * Fallbacks keep the original look when no style attribute is set. */
  --radius-sm: var(--lj-radius-sm, 12px);
  --radius-chip: var(--lj-radius-sm, 9px);
  --radius-lg: var(--lj-radius-lg, 28px);
  --bold: var(--lj-weight-bold, 800);
  display: grid; place-items: center; min-height: 64vh; color: var(--ink);
}
.nf-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; max-width: 460px; padding: 12px; }
.nf-glyph { position: relative; width: 96px; height: 96px; border-radius: var(--radius-lg); display: grid; place-items: center; color: var(--accent); background: rgba(var(--v-theme-secondary), .12); margin-bottom: 4px; }
.nf-code { position: absolute; bottom: -6px; right: -6px; font-family: var(--mono); font-weight: 800; font-size: 15px; color: #fff; background: linear-gradient(135deg, #ff9436, #ff5a52); padding: 3px 9px; border-radius: 999px; box-shadow: 0 8px 16px -8px rgba(255, 90, 82, .6); }
.nf-card h1 { font-family: var(--font); font-weight: var(--bold); letter-spacing: -.03em; font-size: 26px; margin: 0; }
.nf-msg { margin: 0; font-size: 14.5px; color: var(--ink-3); font-weight: 500; line-height: 1.55; }
.nf-path { font-family: var(--mono); font-size: 12.5px; color: var(--ink-3); background: var(--pill); padding: 6px 12px; border-radius: var(--radius-chip); max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
/* CTA is the shared <LjButton>; only the top margin is view-specific. */
.nf-cta { margin-top: 8px; }
</style>
