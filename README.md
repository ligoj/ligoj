# :link: Ligoj

**The open-source project portal**: one place that centralizes every tool of your projects — issue trackers, CI, SCM, quality, cloud provisioning… — with plugin-based connections, fine-grained security and data collection.

![Vue 3](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vuedotjs&logoColor=white) ![Vuetify](https://img.shields.io/badge/Vuetify-4-1867C0?logo=vuetify&logoColor=white) ![Java 25](https://img.shields.io/badge/Java-25-ED8B00?logo=openjdk&logoColor=white) ![Spring Boot](https://img.shields.io/badge/Spring_Boot-4-6DB33F?logo=springboot&logoColor=white) [![Docker](https://img.shields.io/docker/v/ligoj/ligoj-api?logo=docker&label=Docker&logoColor=white)](https://hub.docker.com/r/ligoj/ligoj-api) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ligoj_ligoj&metric=coverage)](https://sonarcloud.io/summary/new_code?id=ligoj_ligoj) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_shield) [![License](http://img.shields.io/:license-mit-blue.svg)](http://fabdouglas.mit-license.org/)

![Ligoj home page](https://github.com/ligoj/ligoj/raw/master/docs/assets/img/home-multi-project.png "Home page")

## Why Ligoj?

- 🧩 **Everything is a plugin** — tools, identity providers, features. Pick from the [published plugins](https://mvnrepository.com/artifact/org.ligoj.plugin) (Jira, Jenkins, SonarQube, GitHub/GitLab, LDAP, AWS/Azure/OVH provisioning…) or [write your own](https://github.com/ligoj/plugin-api). Install, update and remove them from the UI or the CLI, without rebuilding Ligoj.
- 🗂️ **Projects & subscriptions** — each project subscribes to tool instances; health, metrics and key data are collected and displayed on one dashboard.
- 🔐 **Security first** — (O)RBAC model withh regex-based UI/API authorizations, delegated administration, API tokens, session/OAuth2 (OIDC) login, audit trail and signed plugins. See [Security](DOC.md#security).
- 💸 **Cloud cost management** — the provisioning plugins (AWS, Azure, OVH, Outscale…) bring catalog-aware cost estimation and optimization to your projects.
- ⚡ **Modern stack** — Vue 3 + Vuetify 4 SPA (dark mode, i18n EN/FR, mobile-friendly) on a Java 25 / Spring Boot REST API, shipped as Docker images.
- 🤖 **API-first** — every feature is a REST endpoint, browsable from the built-in [OpenAPI explorer](DOC.md#openapi) and scriptable through the [CLI](DOC.md#cli-configuration).

## Get started

Runs with `podman compose` (or Docker Compose — see [Prerequisites](DOC.md#prerequisites)):

```bash
git clone https://github.com/ligoj/ligoj.git && cd ligoj
podman compose -p ligoj -f compose.yml -f compose-override.yml up -d --build
```

Then open <http://localhost:8080/ligoj> and log in:

| Role          | Login         | Password      |
| ------------- | ------------- | ------------- |
| Administrator | `ligoj-admin` | `ligoj-admin` |
| Regular user  | `ligoj-user`  | `ligoj-user`  |

Compose variables, MySQL/PostgreSQL choice, persistent home and image publishing are covered in [Deployment with Docker Compose](DOC.md#deployment-with-docker-compose).

## Documentation

> 📖 **The full documentation lives in [DOC.md](DOC.md)** — this page is only the front door.

| Topic                                                 | Where                                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Architecture & topology                               | [Architecture](DOC.md#architecture)                                                                             |
| Features (security, audit, hooks, files, pagination…) | [Features](DOC.md#features)                                                                                     |
| Security & (O)RBAC model                              | [Security](DOC.md#security)                                                                                     |
| Plugin model, installation & code signing             | [Plugin management](DOC.md#plugin-management)                                                                   |
| Writing a plugin                                      | [Creating your own plugin](DOC.md#creating-your-own-plugin) · [plugin-api](https://github.com/ligoj/plugin-api) |
| UI architecture (Vue 3 host + plugin bundles)         | [UI](DOC.md#ui) · [Frontend development](DOC.md#frontend-development-vite)                                      |
| Backend development, database, packaging              | [Development](DOC.md#development) · [Wiki](https://github.com/ligoj/ligoj/wiki/Dev-Setup)                       |
| Docker installation & configuration reference         | [Docker Installation](DOC.md#docker-installation)                                                               |
| Branding / custom UI                                  | [Customization of the UI](DOC.md#customization-of-the-ui)                                                       |
| REST API & OpenAPI schema                             | [OpenAPI](DOC.md#openapi)                                                                                       |
| SBOM & management endpoints                           | [Management endpoints](DOC.md#management-endpoints)                                                             |

Container-specific details: [app-api](https://github.com/ligoj/ligoj/tree/master/app-api) · [app-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).

## License

[MIT](http://fabdouglas.mit-license.org/) — [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_large)
