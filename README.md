## :link: Ligoj - API [![Docker API](https://img.shields.io/docker/v/ligoj/ligoj-api)](https://hub.docker.com/r/ligoj/ligoj-api) - UI [![Docker UI](https://img.shields.io/docker/v/ligoj/ligoj-ui)](https://hub.docker.com/r/ligoj/ligoj-ui)

![alt text](https://github.com/ligoj/ligoj/raw/master/docs/assets/img/home-multi-project.png "Home page")
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_shield)

A web application to centralize the related tools of your projects, a dynamic connection management with security and
data collection.

More technical details can be found in the subdirectories [ligoj-api](https://github.com/ligoj/ligoj/tree/master/app-api)
and [ligoj-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).

> 📖 **Full documentation lives in [DOC.md](DOC.md)** — architecture, security (O)RBAC model, features, plugin
> development, deployment, the complete configuration reference and troubleshooting. This page is the quick-start;
> deep-dive links below point into `DOC.md`.

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ligoj_ligoj&metric=coverage)](https://sonarcloud.io/summary/new_code?id=ligoj_ligoj)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/abf810c094e44c0691f71174c707d6ed)](https://www.codacy.com/gh/ligoj/ligoj?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ligoj/ligoj&amp;utm_campaign=Badge_Grade)
[![CodeFactor](https://www.codefactor.io/repository/github/ligoj/ligoj/badge)](https://www.codefactor.io/repository/github/ligoj/ligoj)
[![License](http://img.shields.io/:license-mit-blue.svg)](http://fabdouglas.mit-license.org/)



<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.5-4FC08D?logo=vuedotjs&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Vuetify-3.7-1867C0?logo=vuetify&logoColor=white" alt="Vuetify">
  <img src="https://img.shields.io/badge/Pinia-2.2-FFD859?logo=pinia&logoColor=black" alt="Pinia">
  <img src="https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white" alt="Java 21">
  <img src="https://img.shields.io/badge/Tests-194-brightgreen?logo=vitest&logoColor=white" alt="194 tests">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker">
</p>

### Big Thanks

Cross-browser Testing Platform and Open Source <3 Provided by [Sauce Labs][homepage]

[homepage]: https://saucelabs.com


---

## Architecture

```
                     :8080                    :8081
 Navigateur  ──────>  ligoj-ui  ──────────>  ligoj-api  ──────>  ligoj-db
 (Vue 3 SPA)         Spring Boot             Spring Boot          MySQL 8
                     + fichiers Vue          REST API
                     + proxy REST            + plugins Java
```

| Service       | Image                    |  Port   | Description                   |
| :------------ | :----------------------- | :-----: | :---------------------------- |
| **ligoj-db**  | `mysql:8.0`              | &mdash; | Base de donnees               |
| **ligoj-api** | `ligoj/ligoj-api:4.0.1`  |  8081   | API REST backend + plugins    |
| **ligoj-ui**  | Build local (Dockerfile) |  8080   | Frontend Vue 3 + proxy Spring |

See [Architecture](DOC.md#architecture) for the full topology.

---

## Stack technique

| Couche          | Technologie         | Version |                                   |
| :-------------- | :------------------ | :-----: | :-------------------------------- |
| Framework UI    | Vue.js              |   3.5   | Composition API, `<script setup>` |
| Build           | Vite                |   6.0   | HMR < 100ms, build < 2s           |
| UI Library      | Vuetify             |   3.7   | Material Design 3                 |
| State           | Pinia               |   2.2   | Stores reactifs                   |
| Router          | Vue Router          |   4.5   | Hash mode, guards auth            |
| Icons           | MDI                 |   7.4   | 7 000+ icones Material            |
| Tests unitaires | Vitest              |   4.0   | 141 tests                         |
| Tests e2e       | Playwright          |  1.58   | 53 tests                          |
| Runtime         | Java 21 Temurin     |   21    | Spring Boot                       |
| Build Docker    | Node 22 + Maven 3.9 | &mdash; | Multi-stage                       |

---

## Tests

| Suite                  | Framework  |   Tests |   Temps |
| :--------------------- | :--------- | ------: | ------: |
| Stores & composables   | Vitest     |      50 |   ~0.1s |
| Plugin system          | Vitest     |      16 |   ~0.1s |
| Plugin formatters      | Vitest     |      37 |   ~0.1s |
| Plugin API & contracts | Vitest     |      40 |   ~0.1s |
| Views                  | Vitest     |       3 |   ~0.1s |
| **Unitaires (total)**  | **Vitest** | **141** | **~2s** |
| End-to-end             | Playwright |      53 |    ~18s |
| **Total**              |            | **194** |         |

---

## Pages disponibles (18 vues)

| Page             | Route                   | Donnees               |
| :--------------- | :---------------------- | :-------------------- |
| Login            | `/login.html`           | API auth              |
| Home page        | `/#/`                   | Cartes de navigation  |
| Projects list    | `/#/home/project`       | 4 projets (MySQL)     |
| Project details  | `/#/home/project/:id`   | Souscriptions         |
| Users list       | `/#/id/user`            | API live              |
| Groups list      | `/#/id/group`           | API live              |
| Companies list   | `/#/id/company`         | API live              |
| Delegates        | `/#/id/delegate`        | 5 delegations (MySQL) |
| Container Scopes | `/#/id/container-scope` | Onglets group/company |
| System info      | `/#/system/information` | System information    |
| Profile          | `/#/profile`            | User profile          |

> Sans plugin IAM (LDAP/AD), le systeme utilise `feature:iam:empty`. Les pages Identity affichent les donnees retournees par l'API (qui peuvent etre vides). Les pages Projects et Delegates utilisent les vraies donnees MySQL.

### Fonctionnalites transversales

|             | Fonctionnalite               |             | Fonctionnalite            |
| :---------- | :--------------------------- | :---------- | :------------------------ |
| **&check;** | Authentification / Logout    | **&check;** | Dark mode                 |
| **&check;** | Session persistante          | **&check;** | Responsive mobile         |
| **&check;** | Sidebar navigation           | **&check;** | Breadcrumbs               |
| **&check;** | Recherche dans les tables    | **&check;** | Tri des colonnes          |
| **&check;** | Pagination serveur           | **&check;** | Import/Export CSV         |
| **&check;** | Bulk select/delete           | **&check;** | Form guards (dirty state) |
| **&check;** | Gestion d'erreurs (snackbar) | **&check;** | Loading skeletons         |
| **&check;** | i18n FR/EN                   | **&check;** | RBAC (autorisations UI)   |

# Get started

## Prerequisites

The stack builds and runs with `podman compose`. On a machine that already has Docker Compose, Podman must be told to
prefer `podman-compose` — see [Prerequisites](DOC.md#prerequisites) for the one-time provider setup and the sanity check.

Quick install:

```bash
# macOS
brew install podman podman-compose git && podman machine init && podman machine start
# Linux (Debian/Ubuntu): sudo apt install -y podman python3-pip git && pip install --user podman-compose
```

## Run

```bash
git clone https://github.com/ligoj/ligoj.git && cd ligoj
podman compose -p ligoj -f compose.yml -f compose-override.yml up -d --build
```

Then open [Ligoj Home](http://localhost:8080/ligoj) in your browser.

| Role          | Login         | Password      |
| ------------- | ------------- | ------------- |
| Administrator | `ligoj-admin` | `ligoj-admin` |
| Regular user  | `ligoj-user`  | `ligoj-user`  |

For RBAC security, install: `plugin-id`, `plugin-id-ldap`, `plugin-id-ldap-embedded`.

More deployment topics — Compose variables, MySQL/PostgreSQL selection, persistent home, embedding git provenance,
one-script setup and publishing images to AWS ECR — are documented in
[Deployment with Docker Compose](DOC.md#deployment-with-docker-compose).

## Dev section

See the [Development](DOC.md#development) and [Frontend development (Vite)](DOC.md#frontend-development-vite) guides, and
the [Wiki page](https://github.com/ligoj/ligoj/wiki/Dev-Setup).

See each container [ligoj-api](https://github.com/ligoj/ligoj/tree/master/app-api)
and [ligoj-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_large)

# API Description

API is only available from a valid session. See [OpenAPI / API schema](DOC.md#openapi).

- [Swagger UI](http://localhost:8080/ligoj/#/api) page
- [WADL](http://localhost:8080/ligoj/rest/?_wadl)

# Plugin management

Ligoj is massively based on plugin management. All plugins are deployed in
[Maven central](https://mvnrepository.com/artifact/org.ligoj.plugin). To build and deploy a plugin, more information is
available in the [plugin-api](https://github.com/ligoj/plugin-api) repository. See
[Plugin management](DOC.md#plugin-management) for the full model.

# Custom UI

Ligoj comes with a modular approach: the UI can be rebranded or extended by rebuilding
[plugin-ui](https://github.com/ligoj/plugin-ui), shipping your own `plugin-ui-company`, or dropping assets into the Ligoj
home directory. See [Custom UI via plugins](DOC.md#custom-ui-via-plugins) and
[Customization of the UI](DOC.md#customization-of-the-ui).

# Software Bill of Materials (SBOM)

SBOM content is exposed thanks to Spring Actuator at `http://localhost:8080/ligoj/manage/sbom`. See
[Management endpoints](DOC.md#management-endpoints).
