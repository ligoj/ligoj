<h1 align="center">Audit Securite & Architecture</h1>
<h3 align="center">Ligoj v2 — Frontend Vue 3</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Securite-6_corrigees-brightgreen?style=for-the-badge&logo=shield" alt="Securite">
  <img src="https://img.shields.io/badge/Vulnerabilites_ouvertes-0_critique-brightgreen?style=for-the-badge" alt="0 critique">
  <img src="https://img.shields.io/badge/Tests-194_pass-brightgreen?style=for-the-badge&logo=vitest" alt="Tests">
</p>

<p align="center">
  <strong>Date</strong> : Fevrier 2026 &nbsp;&bull;&nbsp;
  <strong>Scope</strong> : <code>app-ui/src/main/webapp/src/</code> &nbsp;&bull;&nbsp;
  <strong>Branche</strong> : <code>vue3-migration</code>
</p>

---

## Synthese

| Categorie | Critique | Haute | Moyenne | Basse | Total |
|:----------|:--------:|:-----:|:-------:|:-----:|:-----:|
| Securite | 3 &rarr; **corrigees** | 3 &rarr; **corrigees** | 2 (recommandations) | 0 | **8** |
| Architecture | 0 | 1 | 3 | 2 | **6** |

> **Toutes les vulnerabilites critiques et hautes ont ete corrigees.** Zero vulnerabilite ouverte de severite critique ou haute.

---

## 1. Vulnerabilites de securite

### Critiques (corrigees)

<table>
<tr><th>ID</th><th>Vulnerabilite</th><th>Fichier</th><th>Avant</th><th>Apres</th></tr>
<tr>
  <td><strong>SEC-01</strong></td>
  <td>XSS via <code>v-html</code></td>
  <td><code>LoginApp.vue</code></td>
  <td><code>&lt;span v-html="errorMsg" /&gt;</code> permettait l'injection HTML</td>
  <td><code>{{ errorMsg }}</code> — auto-escaping Vue. Verifie : <strong>aucun <code>v-html</code> dans tout le projet</strong></td>
</tr>
<tr>
  <td><strong>SEC-02</strong></td>
  <td>Execution de code arbitraire</td>
  <td><code>nls-adapter.js</code></td>
  <td><code>new Function('return (' + match[1] + ')')()</code> evaluait du code serveur</td>
  <td>Conversion JS&rarr;JSON + <code>JSON.parse()</code>. Aucune evaluation dynamique</td>
</tr>
<tr>
  <td><strong>SEC-03</strong></td>
  <td>Open Redirect</td>
  <td><code>stores/error.js:31-43</code></td>
  <td><code>window.location.href = redirect</code> sans validation</td>
  <td>Validation same-origin via <code>new URL()</code> — seul le meme domaine est accepte</td>
</tr>
</table>

### Hautes (corrigees)

<table>
<tr><th>ID</th><th>Vulnerabilite</th><th>Fichier</th><th>Avant</th><th>Apres</th></tr>
<tr>
  <td><strong>SEC-04</strong></td>
  <td>Injection i18n</td>
  <td><code>stores/i18n.js:18-29</code></td>
  <td>Parametres <code>{{key}}</code> interpoles sans echappement HTML</td>
  <td>Fonction <code>escapeHtml()</code> appliquee sur toutes les valeurs avant interpolation</td>
</tr>
<tr>
  <td><strong>SEC-05</strong></td>
  <td>URL encoding manquant</td>
  <td><code>LoginApp.vue:270,322,341</code></td>
  <td><code>username</code> et <code>mail</code> dans les URLs sans encodage</td>
  <td><code>encodeURIComponent()</code> sur les 3 interpolations URL</td>
</tr>
<tr>
  <td><strong>SEC-06</strong></td>
  <td>Path traversal plugin</td>
  <td><code>plugins/loader.js:15-18</code></td>
  <td><code>pluginId</code> interpole directement dans <code>/webjars/${pluginId}/vue/index.js</code></td>
  <td>Validation regex <code>/^[a-zA-Z0-9][\w-]*$/</code> avant toute utilisation</td>
</tr>
</table>

### Moyennes (recommandations)

| ID | Sujet | Detail | Recommandation |
|:---|:------|:-------|:---------------|
| **SEC-07** | Pas de token CSRF explicite | Les appels API utilisent `credentials: 'include'` mais aucun token CSRF n'est envoye. Les requetes `application/json` sont protegees par CORS | Verifier que le backend envoie `SameSite=Lax` ou `Strict` + `HttpOnly` + `Secure` sur les cookies de session |
| **SEC-08** | Auto-dismiss erreurs sensibles | Les erreurs disparaissent apres 8s, y compris 401/403 | Envisager de ne pas auto-dismiss les erreurs de type authentification |

---

## 2. Verification complete du code

Audit realise sur les **82 fichiers source** (.vue + .js, hors tests et node_modules).

| Verification | Resultat | Detail |
|:-------------|:--------:|:-------|
| Usage de `v-html` | **&check; Aucun** | 42 fichiers .vue verifies |
| Usage de `eval()` / `new Function()` | **&check; Aucun** | nls-adapter utilise `JSON.parse()` |
| Usage de `innerHTML` / `document.write` | **&check; Aucun** | Aucune manipulation DOM directe |
| Secrets hardcodes (cles API, tokens, mots de passe) | **&check; Aucun** | Seules des cles i18n comme `'error-password'` |
| `localStorage` pour tokens d'auth | **&check; Non** | Utilise uniquement pour la preference de langue (`ligoj-locale`) |
| `credentials: 'include'` sur les fetch | **&check; Oui** | 15 occurrences, auth par cookies uniquement |
| Validation Content-Type en reponse | **&check; Oui** | `useApi.js:20-23` verifie `application/json` avant `response.json()` |
| Encodage URL des parametres utilisateur | **&check; Oui** | `encodeURIComponent()` sur username et mail dans LoginApp |
| Validation des IDs plugin | **&check; Oui** | Regex stricte dans `loader.js:16` |
| Validation redirect same-origin | **&check; Oui** | `new URL()` + comparaison `origin` dans `error.js:34-37` |
| Echappement HTML dans i18n | **&check; Oui** | `escapeHtml()` dans `i18n.js:18-19` |

---

## 3. Points forts — Securite

| # | Point | Detail |
|:-:|:------|:-------|
| 1 | **Auto-escaping Vue** | `{{ }}` utilise partout, zero `v-html` |
| 2 | **Auth par cookies** | `credentials: 'include'` sur tous les fetch, pas de tokens en localStorage |
| 3 | **Zero manipulation DOM** | Aucun `getElementById`, `innerHTML`, jQuery residuel |
| 4 | **Validation formulaires** | Rules Vuetify (required, email, password strength) |
| 5 | **Password reset securise** | Token + CAPTCHA + validation complexite |
| 6 | **Zero secret en dur** | Aucune cle API, token ou mot de passe dans le code source |
| 7 | **CSP-friendly** | Pas d'inline scripts, pas d'eval |
| 8 | **Hash routing securise** | Tokens reset extraits via regex stricte `[a-zA-Z0-9\-]+` |
| 9 | **Content-Type verifie** | Reponses JSON parsees uniquement si le header le confirme |
| 10 | **Plugin sandboxing** | IDs valides par regex avant chargement dynamique |

---

## 4. Architecture

### Points d'attention

| ID | Severite | Sujet | Fichier | Recommandation |
|:---|:--------:|:------|:--------|:---------------|
| **ARCH-01** | Haute | ProvPlugin.vue volumineux (414 lignes) | `plugins/prov/ProvPlugin.vue` | Extraire les tabs en sous-composants |
| **ARCH-02** | Moyenne | useProvStore utilise `reactive()` | `plugins/prov/useProvStore.js` | Migrer vers un store Pinia (`defineStore()`) pour coherence |
| **ARCH-03** | Moyenne | LoginApp ne partage pas le systeme i18n | `LoginApp.vue` | Acceptable — page separee sans Vuetify. Documenter la raison |
| **ARCH-04** | Moyenne | 8 plugins importes statiquement | `plugins/index.js` | `defineAsyncComponent()` pour le chargement differe |
| **ARCH-05** | Basse | Absence de TypeScript | Global | Migration progressive possible en commencant par stores/composables |
| **ARCH-06** | Basse | Documentation composants visuels | `plugins/prov/` | Storybook ou exemples pour les 4 charts SVG |

### Points forts

| # | Point | Detail |
|:-:|:------|:-------|
| 1 | **Composition API coherente** | `<script setup>` partout, zero Options API |
| 2 | **Stores Pinia bien structures** | 4 stores (auth, app, error, i18n) avec responsabilites claires |
| 3 | **Composables reutilisables** | `useApi`, `useDataTable`, `useFormGuard`, `useImportExport` bien decouples |
| 4 | **Systeme de plugins extensible** | Registry + loader avec chargement hybride (statique built-in + dynamique tiers) |
| 5 | **Charts SVG sans dependance** | 4 composants natifs remplacant D3.js (~5 000 LOC &rarr; ~280 LOC) |
| 6 | **i18n complet** | 336 cles FR/EN, switchable a chaud, compatible plugins legacy NLS |
| 7 | **Bundle optimise** | `manualChunks` : vuetify, vendor (vue + router + pinia), app, icons |
| 8 | **Build ultra-rapide** | Vite 6 : production en ~1.2s, HMR < 100ms |
| 9 | **CI/CD fonctionnel** | GitHub Actions : install &rarr; lint &rarr; test &rarr; build |
| 10 | **2 entry points** | `v-index.html` (app complete) + `v-login.html` (login leger sans Vuetify) |

---

## 5. Metriques

| Metrique | Valeur |
|:---------|-------:|
| Fichiers source (.vue + .js) | 82 |
| Composants Vue | 42 |
| Fichiers JS (stores, composables, plugins) | 40 |
| Stores Pinia | 4 |
| Composables | 8 |
| Plugins metier | 8 |
| Cles i18n (par langue) | 336 |
| Tests unitaires (Vitest) | 141 |
| Tests e2e (Playwright) | 53 |
| **Tests total** | **194** |
| Build time | 1.2s |
| Bundle JS (gzip) | ~109 kB |
| Bundle CSS (gzip) | ~118 kB |
| Dependencies runtime | 6 (vue, vue-router, pinia, vuetify, vee-validate, @mdi/font) |
| Dependencies dev | 4 (vite, @vitejs/plugin-vue, sass, @playwright/test) |

---

## 6. Conclusion

<table>
<tr>
<td width="50%" valign="top">

### Securite

Le code est **securise**. Les 6 vulnerabilites identifiees (3 critiques + 3 hautes) ont toutes ete corrigees et verifiees. Aucune faille ouverte de severite critique ou haute.

Les 2 recommandations restantes (CSRF cookies, auto-dismiss) sont des ameliorations mineures qui dependent de la configuration backend.

</td>
<td width="50%" valign="top">

### Architecture

Le code est **de bonne qualite**. Les patterns sont coherents (Composition API, Pinia, fetch natif), la couverture de test est solide (194 tests), et le build est optimise.

Les recommandations portent sur du refactoring (ProvPlugin.vue) et des ameliorations progressives (TypeScript, lazy loading).

</td>
</tr>
</table>

### Priorites recommandees

| Priorite | Action | Impact |
|:--------:|:-------|:-------|
| 1 | Verifier config cookies backend (`SameSite`, `HttpOnly`, `Secure`) | Securite |
| 2 | Decouper ProvPlugin.vue en sous-composants | Maintenabilite |
| 3 | Lazy loading des plugins avec `defineAsyncComponent()` | Performance |
