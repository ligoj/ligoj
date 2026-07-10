[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-ui.svg)](https://hub.docker.com/r/ligoj/ligoj-ui)

# UI (REST+JS) container running a stateful Spring Boot application.

Browser side roles:

- URL security level applied to the UI component with hierarchy pruning. Can be overridden.
- i18n

Server side roles:

- REST endpoints proxy
- White/secured URL
- Session holder

## Documentation

This module's build, run and configuration details live in the top-level **[DOC.md](../DOC.md)**:

- [Frontend development (Vite)](../DOC.md#frontend-development-vite) — dev server + plugin build/test loop. The in-depth Vue rewrite guide (plugin contract, host surface, gotchas) is **[REWRITE_VUEJS.md](REWRITE_VUEJS.md)**.
- [Packaging](../DOC.md#packaging) · [Running a single container (development)](../DOC.md#running-a-single-container-development) · [Building the Docker images](../DOC.md#building-the-docker-images)
- [Docker Execution](../DOC.md#docker-execution) · [Endpoints](../DOC.md#endpoints)
- [UI container properties](../DOC.md#ui-container-properties) — the full property reference
- [Compatibilities (JSE)](../DOC.md#compatibilities)

For the security model, login modes and reverse-proxy integration, see [DOC.md](../DOC.md).
