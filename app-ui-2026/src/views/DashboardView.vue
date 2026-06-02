<template>
  <div class="dash">
    <header class="hero">
      <div class="hero-txt">
        <h1>Tableau de bord</h1>
        <p>Bonjour <b>{{ auth.userName || 'invité' }}</b> — bienvenue sur l'aperçu de l'interface 2026.</p>
      </div>
      <div class="kpis">
        <div class="kpi" style="--a:#2f6df6"><div class="v">124</div><div class="l">Projets</div></div>
        <div class="kpi" style="--a:#16a36a"><div class="v">18</div><div class="l">Outils</div></div>
        <div class="kpi" style="--a:#8b5cf6"><div class="v">2 348</div><div class="l">Souscriptions</div></div>
      </div>
    </header>

    <div class="note">
      <v-icon>mdi-information-outline</v-icon>
      <span>Application <b>UI 2026</b> autonome (aperçu). Elle réutilise l'API et les stores de Ligoj sans toucher à l'application actuelle. Les pages se migrent une à une — commence par ton <a @click="$router.push('/profile')">Profil</a>.</span>
    </div>

    <div class="cards">
      <article v-for="c in CARDS" :key="c.t" class="card" :style="{ '--c': c.c }" @click="c.to ? $router.push(c.to) : toast()">
        <div class="glyph"><v-icon>{{ c.icon }}</v-icon></div>
        <div class="t">{{ c.t }}</div>
        <div class="d">{{ c.d }}</div>
        <div class="cta">{{ c.to ? 'Ouvrir →' : 'Bientôt' }}</div>
      </article>
    </div>

    <div class="toast" :class="{ show: msg }">{{ msg }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const CARDS = [
  { t: 'Profil', d: 'Compte, préférences, thème.', icon: 'mdi-account-circle', c: '#2f6df6', to: '/profile' },
  { t: 'Identité', d: 'Utilisateurs, groupes, entités, délégués.', icon: 'mdi-account-group', c: '#16a36a' },
  { t: 'Projets', d: 'Projets et souscriptions aux outils.', icon: 'mdi-folder', c: '#e0901a' },
  { t: 'Administration', d: 'Plugins, nœuds, configuration.', icon: 'mdi-cog', c: '#db2777' },
]
let tT
const msg = ref('')
function toast() { msg.value = 'Page à venir dans la refonte'; clearTimeout(tT); tT = setTimeout(() => (msg.value = ''), 2000) }
</script>

<style scoped>
.dash {
  --surface: rgb(var(--v-theme-surface));
  --ink: rgb(var(--v-theme-on-surface));
  --muted: rgba(var(--v-theme-on-surface), .6);
  --line: rgba(var(--v-theme-on-surface), .12);
  --primary: rgb(var(--v-theme-primary));
  --on-primary: rgb(var(--v-theme-on-primary));
  --font: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  --mono: "JetBrains Mono", ui-monospace, monospace;
  color: var(--ink);
}
.hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; flex-wrap: wrap; padding: 24px 26px; border-radius: 22px; margin-bottom: 18px; color: var(--on-primary);
  background: radial-gradient(600px 200px at 100% -40%, rgba(255,255,255,.18), transparent 70%), linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000));
  box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--primary) 80%, transparent); }
.hero-txt h1 { font-family: var(--font); font-weight: 800; letter-spacing: -.035em; font-size: 30px; margin: 0; }
.hero-txt p { margin: 6px 0 0; font-size: 14.5px; opacity: .9; }
.kpis { display: flex; gap: 12px; flex-wrap: wrap; }
.kpi { background: rgba(255,255,255,.14); border-radius: 14px; padding: 12px 16px; min-width: 104px; }
.kpi .v { font-family: var(--mono); font-weight: 700; font-size: 22px; }
.kpi .l { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; opacity: .85; margin-top: 2px; }

.note { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; font-size: 13.5px; color: var(--muted); }
.note a { color: var(--primary); font-weight: 700; cursor: pointer; }

.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 20px; cursor: pointer; transition: transform .16s, box-shadow .16s, border-color .16s; }
.card:hover { transform: translateY(-3px); box-shadow: 0 22px 44px -22px color-mix(in srgb, var(--c) 55%, transparent); border-color: color-mix(in srgb, var(--c) 35%, var(--line)); }
.glyph { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; margin-bottom: 13px; color: var(--c); background: color-mix(in srgb, var(--c) 15%, var(--surface)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 25%, transparent); }
.card .t { font-family: var(--font); font-weight: 800; font-size: 16px; }
.card .d { font-size: 13px; color: var(--muted); margin: 5px 0 12px; line-height: 1.45; }
.card .cta { font-size: 12.5px; font-weight: 800; color: var(--c); }

.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(16px); background: var(--ink); color: var(--surface); padding: 11px 18px; border-radius: 12px; font-weight: 700; font-size: 14px; z-index: 60; opacity: 0; transition: .25s; pointer-events: none; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
