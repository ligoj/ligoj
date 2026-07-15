# Ligoj AI — conception & feuille de route

> Assistant IA intégré à Ligoj, branché sur le contexte réel de la plateforme via un **serveur MCP**.
> Statut : proposition de conception (branche `norman/ligoj-ai`). Auteur : Norman.

---

## 1. Vision

Ligoj centralise déjà le contexte d'exploitation d'une DSI : **projets**, **souscriptions** aux
outils (Jira, Jenkins, LDAP, SonarQube, GitLab, Confluence, provisioning cloud AWS/Azure…),
**utilisateurs & droits** (groupes LDAP, délégations), **coûts cloud**, **santé des outils**.

**Ligoj AI** transforme ce contexte en un **assistant conversationnel** : au lieu de naviguer
manuellement entre projets, souscriptions et annuaire, l'utilisateur pose une question en langage
naturel et l'IA répond en s'appuyant sur les **données réelles de Ligoj**, dans la limite de **ce
qu'il a le droit de voir**.

Exemple phare (issu de la maquette) :

> **« Pourquoi jdupont n'accède pas à Jenkins sur BNPP — KYC ? »**
> → L'IA vérifie : membre de `delivery-core` ✅ · le projet exige le groupe `projet-kyc` ❌ manquant
> → Diagnostic clair + action proposée (ajouter au groupe).

## 2. Les capacités (cartes de la maquette)

| Capacité | Ce que l'IA fait | Données Ligoj mobilisées |
|---|---|---|
| **Diagnostic d'accès & droits** ⭐ | « Pourquoi X n'accède pas à l'outil Y ? » → vérifie groupes, délégations, souscriptions | Users, groupes LDAP, délégations, souscriptions |
| **Estimation financière Cloud** | Estime/compare des coûts cloud (AWS, Azure…) pour un projet | plugin-prov (catalogues, quotes, prix) |
| **Dimensionnement & capacité** | Recommande des ajustements CPU/RAM/instances selon l'usage réel | plugin-prov, métriques d'usage |
| **Assistant troubleshooting** | Analyse un incident (build en échec, outil KO) et propose des étapes | Santé des souscriptions, statuts outils |
| **Serveur MCP** | Configure le serveur MCP qui expose le contexte Ligoj aux agents IA | Config Ligoj |
| **Contexte & sources** | Choisit les données Ligoj exposées à l'IA (projets, annuaire, coûts…) | Config / gouvernance |

Toutes reposent sur le **même socle** : un serveur MCP qui expose le contexte Ligoj + un assistant
qui l'exploite.

## 3. Architecture

```
┌───────────────────────────────────────────────────────────┐
│  UI Vue 3 — page « Ligoj AI »                              │
│    · cartes de capacités  · chat « Assistant Ligoj »       │
└───────────────┬───────────────────────────────────────────┘
                │  REST + SSE (streaming des réponses)
┌───────────────▼───────────────────────────────────────────┐
│  Backend Spring Boot (nouveau plugin : plugin-ai)          │
│                                                            │
│   1. Endpoint /ai/chat  → SDK anthropic-java (Claude)      │
│        · streaming, tool use / MCP connector               │
│                                                            │
│   2. Serveur MCP Ligoj  → expose des OUTILS lecture :      │
│        projets, souscriptions, users, droits, coûts, santé │
│        ⚠️ CHAQUE outil s'exécute sous l'identité de        │
│           l'utilisateur connecté (sécurité + délégations)  │
└───────────────┬───────────────────────────────────────────┘
                │  HTTPS
        ┌───────▼────────┐
        │  Claude (API)  │  claude-opus-4-8 (ou Bedrock/Foundry configurable)
        └────────────────┘
```

**Deux briques distinctes, réutilisables :**

- **Le serveur MCP Ligoj** est la brique de fond, et le vrai actif capitalisable : il rend le
  contexte Ligoj interrogeable par **n'importe quel client MCP** (l'assistant intégré, mais aussi
  Claude Desktop, Claude Code, un agent tiers…). On l'écrit une fois, tout le reste s'appuie dessus.
- **L'assistant intégré** (le chat) est un client de ce serveur : le backend appelle Claude en lui
  donnant accès aux outils MCP Ligoj, et streame la réponse à l'UI.

## 4. Surface d'outils MCP (proposition)

Outils **en lecture seule** pour la v1 (aucune modification sans confirmation explicite — voir §6) :

| Outil MCP | Rôle |
|---|---|
| `ligoj.list_projects` | Liste les projets visibles par l'appelant |
| `ligoj.get_project` | Détail d'un projet (souscriptions, équipe) |
| `ligoj.list_subscriptions` | Souscriptions d'un projet + statut/santé |
| `ligoj.get_user` | Profil d'un utilisateur (société, groupes, verrouillage) |
| `ligoj.get_user_access` | Groupes + délégations effectives d'un utilisateur |
| `ligoj.diagnose_access` ⭐ | « user × outil × projet » → OK / bloqué + raison |
| `ligoj.get_cloud_costs` | Coûts prov d'un projet (instances, prix) |
| `ligoj.estimate_quote` | Estimation d'un dimensionnement (plugin-prov) |
| `ligoj.get_tool_health` | Santé/incidents d'une souscription |

Les 6 cartes de l'UI sont des **flux guidés** (prompts pré-remplis) au-dessus de ces outils.

## 5. Choix techniques

- **SDK backend** : `com.anthropic:anthropic-java` (aligné sur le backend Java 21 / Spring Boot).
- **Modèle** : `claude-opus-4-8` par défaut (la maquette montre « claude-opus-4 ») ; **configurable**.
- **Streaming** : réponses streamées vers l'UI (SSE) — cohérent avec un chat.
- **MCP** : exposer les outils Ligoj via un **serveur MCP** (SDK MCP Java `io.modelcontextprotocol`).
  Côté assistant, deux options : le **connecteur MCP** de l'API Messages (`mcp_servers`) ou un pont
  outils-MCP → tool use. À trancher au POC (le connecteur est le plus direct).
- **Fournisseur** : API Anthropic directe **ou** endpoint configurable (Bedrock/Foundry) — certaines
  DSI exigent un hébergement maîtrisé. Réutiliser le système de **configuration Ligoj** (comme les
  autres plugins) pour l'endpoint + la clé.
- **Intégration Ligoj** : un **nouveau plugin** (`plugin-ai`), conforme à l'architecture modulaire
  existante (comme `plugin-prov`, `plugin-id`…). L'UI est un fragment de plugin-ui.

## 6. Sécurité — le point différenciant

L'IA touche à des données sensibles (droits, coûts, annuaire). La sécurité **est** la feature.

1. **Rights-aware (non négociable)** : chaque outil MCP s'exécute **sous l'identité de l'utilisateur
   connecté** et **réutilise la couche de sécurité + délégations existante de Ligoj**. L'IA ne peut
   jamais voir/répondre au-delà de ce que l'utilisateur voit déjà dans l'UI. Zéro escalade.
2. **Lecture seule d'abord** : v1 = outils en lecture. Toute action (ajouter un user à un groupe…)
   passe par une **confirmation explicite** dans l'UI, jamais exécutée par l'IA seule.
3. **Secret management** : clé API stockée via le mécanisme de config/secret Ligoj, jamais en dur,
   jamais renvoyée à l'UI.
4. **Anti-injection** : les données Ligoj (noms de projets, commentaires…) sont du **contenu**, pas
   des instructions. Le system prompt le cadre ; les sorties d'outils ne sont pas des ordres.
5. **Audit** : journaliser chaque interaction (question, outils appelés, utilisateur) pour la
   traçabilité.
6. **Confidentialité** : endpoint configurable pour les DSI qui refusent l'API publique (Bedrock/
   self-host) ; pas d'exfiltration de données hors du périmètre choisi (« Contexte & sources »).

## 7. Feuille de route (par étapes)

| Phase | Contenu | Pourquoi d'abord |
|---|---|---|
| **P0 — Socle MCP** | Serveur MCP Ligoj + 3 outils lecture rights-aware (`list_projects`, `list_subscriptions`, `diagnose_access`). Testable direct depuis Claude Desktop / Claude Code. | La brique réutilisable ; prouve le rights-aware end-to-end |
| **P1 — Assistant (POC)** ⭐ | Chat « Assistant Ligoj » branché sur Claude + outils MCP, centré sur le **diagnostic d'accès/droits**. | Cas le plus « Ligoj-natif », ROI clair (équipes support) |
| **P2 — Cartes** | Estimation coûts, dimensionnement, troubleshooting — flux guidés sur les outils | Étend la valeur une fois le socle prouvé |
| **P3 — Config & gouvernance** | Page « Serveur MCP », « Contexte & sources », choix modèle/endpoint, audit | Industrialisation / self-service DSI |

**Recommandation** : commencer par **P0 + le POC P1 sur le diagnostic d'accès**. C'est le plus
impressionnant à démontrer, le plus ancré dans ce que Ligoj sait déjà faire, et ça valide toute la
chaîne (MCP rights-aware → Claude → UI) sur un périmètre étroit.

## 8. Décisions actées (Norman)

1. **Fournisseur = endpoint configurable d'emblée.** Le backend choisit son client selon la config
   Ligoj : Anthropic directe, **Amazon Bedrock** (`BedrockMantleBackend`), ou Microsoft Foundry
   (`FoundryBackend`) — tous supportés par le SDK `anthropic-java`. Clé/endpoint/modèle dans la
   config Ligoj. Cible « entreprise » (hébergement maîtrisé) dès le départ.
2. **Périmètre POC = plusieurs cartes d'emblée** : **diagnostic d'accès** + **estimation coûts** +
   **troubleshooting** (au minimum). Le socle MCP les alimente toutes.

### Restent à trancher (au fil de l'implémentation)

3. **MCP** : connecteur MCP de l'API Messages, ou pont tool-use maison ? (à valider sur l'archi réelle).
4. **Plugin** : nouveau `plugin-ai` dédié (recommandé, conforme à l'archi modulaire) vs module existant.

## 9. Plan d'implémentation (fondé sur le code réel)

Ligoj s'étale sur **4 dépôts** : `bootstrap` (socle), `ligoj-api` (`plugin-api`, `plugin-core`,
`plugin-parent`), `ligoj` (webapps `app-api`/`app-ui`), `ligoj-plugins` (plugins métier).

### 9.1 Backend — nouveau module `plugin-ai` (dans `~/git/ligoj-plugins/plugin-ai/`)

- **`pom.xml`** : parent `org.ligoj.api:plugin-parent` (4.3.2), `artifactId=plugin-ai`. Ajouter la
  dépendance `com.anthropic:anthropic-java`.
- **`AiPluginResource`** (`org.ligoj.app.plugin.ai.AiPluginResource`) : `@Service @Path("/service/ai")`,
  implémente `FeaturePlugin` (`getKey()="service:ai"`, `getName()`, `getVersion()`,
  `getInstalledEntities()→[Node.class]`). C'est le point d'entrée REST + l'enregistrement de la feature.
- **`csv/node.csv`** : `service:ai;Ligoj AI;;ALL;mdi mdi-robot;technical;...` (chargé à l'install).
- **Fournisseur configurable** — `AiClientFactory` : lit la config Ligoj (via `ConfigurationResource`
  du core : `service:ai:provider` = `anthropic|bedrock|foundry`, `:endpoint`, `:api-key`, `:model`
  défaut `claude-opus-4-8`, `:region`) et construit le client SDK adéquat (`AnthropicOkHttpClient` /
  `BedrockMantleBackend` / `FoundryBackend`). Clé jamais renvoyée à l'UI.
- **Outils rights-aware** — `AiContextService` : méthodes qui réutilisent l'existant, **toujours** avec
  `securityHelper.getLogin()` :
  - `listProjects()` → `projectRepository.findAllLight(login, "", page)`
  - `getSubscriptions(project)` → `checkVisible` puis `subscriptionRepository.findAllByProject(id)`
  - `getUserGroups(user)` → `iamProvider[0].getConfiguration().getUserRepository().findById(user).getGroups()`
  - `diagnoseAccess(user, node, project)` → croise groupes/délégations/souscriptions → verdict + raison
  - `getProjectCost(project)` → souscriptions prov visibles → `ProvResource.getConfiguration(sub).cost`
    (via `ServicePluginLocator`)
  - `getToolHealth(subscription)` → statut/santé de la souscription
- **Endpoints REST** (`AiResource`) : `POST /service/ai/chat` (SSE, streaming), + endpoints des cartes
  (`/diagnose-access`, `/estimate-cost`, `/troubleshoot`) qui pré-remplissent le prompt/outils.
- **MCP** : exposer `AiContextService` comme **serveur MCP** (SDK MCP Java) — brique réutilisable.
  Pour le chat, brancher ces outils via tool use (ou le connecteur MCP). *Détail à figer au 1er jet.*

### 9.2 Frontend — `plugin-ai/ui/` (Vite) + câblage host (`~/git/ligoj/app-ui/`)

- **`plugin-ai/ui/src/index.js`** : `export default { id:'ai', component: AiPlugin, routes:[{path:'/ai'}],
  install({router}), meta:{ icon:'mdi-robot', color:'deep-purple' } }` (calqué sur `plugin-prov/ui/src/index.js`).
  Compilé vers `src/main/resources/META-INF/resources/webjars/ai/vue/index.js`.
- **Composants Vue** : page « Ligoj AI » (hero + bandeau MCP + grille de cartes + chat streamé) —
  reprendre le design de la maquette `ligoj-2026-prototype.html`.
- **Câblage host** (branche `norman/ligoj-ai`) : ajouter `'ai'` à `REQUIRED_PLUGINS`
  (`app-ui/src/main/webapp/src/main.js`) + une entrée dans `BASE_NAV` (`app-ui/.../App.vue`,
  `route:'/ai'`, clé i18n `nav.ai`).

### 9.3 Ordre de construction

1. **Backend socle** : module `plugin-ai` + `AiPluginResource` (feature) + `AiClientFactory` (config
   multi-fournisseur) + `AiContextService` (3 outils rights-aware : projets, souscriptions, diagnose-access).
2. **Serveur MCP** exposant `AiContextService` → testable depuis Claude Desktop/Code.
3. **Endpoint chat** streamé + endpoints cartes (diagnose-access, estimate-cost, troubleshoot).
4. **UI Vue** : page + cartes + chat, câblée dans le host.
5. Build + test bout-en-bout dans l'IntelliJ run (workflow Norman).

⚠️ **Multi-repo** : le backend `plugin-ai` vit dans `~/git/ligoj-plugins/plugin-ai` (probable dépôt
git dédié comme les autres plugins) ; le câblage host UI est sur la branche `norman/ligoj-ai` de
`~/git/ligoj`. À clarifier : `plugin-ai` = nouveau dépôt git, ou dossier dans un mono-repo plugins ?

---

*Maquette de référence : `ligoj-2026-prototype.html` (branche `norman/ui-2026-prototype`), vue `#ai`.*
