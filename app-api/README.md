[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-api.svg)](https://hub.docker.com/r/ligoj/ligoj-api)

# API (REST) container running a stateless Spring Boot application.

## Roles

- URL security level, with RBAC: User / Role / Permission for a URL pattern supporting dynamic configuration.
- Resource security level (the most complex) allows users, groups, and companies to access (read, write, and grant) nodes, users, groups, and companies.
- Plugin runtime and lifecycle management.

## Documentation

This module's build, run and configuration details live in the top-level **[DOC.md](../DOC.md)**:

- [API schema examples (OpenAPI / WADL)](../DOC.md#api-schema-examples) and [Management endpoints](../DOC.md#management-endpoints)
- [Packaging](../DOC.md#packaging) · [Running a single container (development)](../DOC.md#running-a-single-container-development) · [Building the Docker images](../DOC.md#building-the-docker-images)
- [Database setup](../DOC.md#database-setup) · [Docker Execution](../DOC.md#docker-execution)
- [Compatibilities (database & JSE)](../DOC.md#compatibilities)
- [API Container properties](../DOC.md#api-container-properties) — the full property reference

For the security model, features and plugin development, start at the [DOC.md](../DOC.md) table of contents.
