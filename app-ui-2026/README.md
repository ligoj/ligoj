# Ligoj — UI 2026 (aperçu)

Refonte « Vibrant » de l'interface Ligoj, en **application Vite autonome** lancée
à côté de l'app actuelle. Elle **réutilise** le code de `app-ui/` (stores,
composables, host, plugins) en lecture seule via l'alias `@` — l'app actuelle
n'est jamais modifiée. Branche : `feature/ui-2026`.

## Prérequis

- **Node 18+** et npm.
- Le dépôt `ligoj` cloné **avec `app-ui/` présent** (l'UI 2026 importe son code
  via l'alias `@`, configuré dans `vite.config.js`).
- Un **backend Ligoj qui tourne** et sert `/ligoj/rest` (REST), `/ligoj/login`,
  `/ligoj/main` (bundles de plugins). En dev, c'est typiquement l'app-ui sur
  `:8080` qui proxie vers l'API sur `:8081`.

## Lancer

```bash
cd app-ui-2026
npm install

# Backend par défaut : http://localhost:8080
npm run dev

# …ou pointer un autre backend (le vôtre) sans toucher au code :
LIGOJ_BACKEND=https://ligoj.mon-entreprise.fr npm run dev
```

Puis ouvrir **http://localhost:5174/ligoj/** et se connecter.

La variable `LIGOJ_BACKEND` configure la cible du proxy (REST, login, logout,
captcha, bundles de plugins). La session est partagée via le cookie proxifié
(`cookieDomainRewrite` → `localhost`).

> **Backend OIDC / SSO :** la connexion via le proxy local fonctionne au mieux
> avec un **provider local** (identifiant / mot de passe). Un backend en SSO
> peut casser sur les redirections cross-origin du login — à tester.

## Build de production

```bash
npm run build      # génère dist/
npm run preview    # sert le build localement
```

## Données réelles vs démo

L'app affiche **les vraies données du backend** presque partout :

- **Identité** (utilisateurs, groupes, entités, délégués, portées),
  **Administration** (plugins, nœuds, configuration, rôles, utilisateurs,
  cache, bench, information), **API / Jetons**, **Profil** → 100 % réel.
- **Projets** (cockpit + détail) → réel dès qu'il y a des projets ; un aperçu
  de démonstration s'affiche uniquement si le backend est vide.
- **Tableau de bord (accueil)** → agrège les **vraies souscriptions par outil**
  (un seul appel `rest/project`) ; si aucune souscription n'existe, il bascule
  sur un **jeu de démonstration** (badge « Aperçu »).

Autrement dit : sur un backend **peuplé**, l'interface est quasi intégralement
en données réelles. Sur un backend **vide** (base de dev neuve), certains écrans
montrent un aperçu de démonstration.

> Les plugins outils (LDAP, provisioning, …) doivent être **déployés sur le
> backend** pour que leurs champs de paramètres et libellés s'affichent dans le
> wizard de souscription (sinon : champs texte bruts).

## Architecture (résumé)

- `vite.config.js` : alias `@` → `../app-ui/.../src` (core), `@2026` → `src/`,
  `@ligoj/host` → `core/host.js` ; proxy backend configurable ; import-map dev
  pour partager les singletons (vue/pinia/vuetify/host) avec les bundles de
  plugins chargés à l'exécution.
- `src/main.js` : boot preset/compact + chargement des plugins cœur + montage.
- `src/router.js` : routes (hash mode).
- `src/App.vue` : shell (sidebar, barre, breadcrumbs, ErrorSnackbar,
  LoginPromptDialog).
- `src/views/` : les écrans. `src/components/` : composants partagés
  (`VibrantDataTable`, `VibrantConfirmDialog`, `ErrorSnackbar`, …).
- `src/styles/v26-styles.css` : calque de « style » par thème (`data-style`) —
  Paper / Brutalist / Cyber, etc.

## Thèmes

Le thème se choisit dans **Profil → Préférences → Thème**. Chaque thème combine
une palette de couleurs et un « style » (police + structure) : la plupart ne
changent que les couleurs, mais **Paper** (serif éditorial), **Solarized Brutal**
(monospace, néobrutalisme) et **Cyber Ligoj** (néon) transforment toute l'UI.
