[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-ui.svg)](https://hub.docker.com/r/ligoj/ligoj-ui)

# UI (REST+JS) container running a stateful Spring Boot application.

Browser side roles:

- URL security level applied to the UI component with hierarchy pruning. Can be overridden.
- i18n

Server side roles:

- REST endpoints proxy
- White/secured URL
- Session holder

# Packaging (with Maven)

Compile Java sources and package into the WAR file.

```bash
mvn clean package -DskipTests=true
```

Note: you can run this command either from the root module or from the `app-ui` module. When executed from the root
module, both WARs (`app-api` and `app-ui`) will be created.

# Test the WAR

Test the integration with a running API endpoint:

```bash
java -Dligoj.endpoint="http://192.168.4.138:8081/ligoj-api" -jar target/app-ui-4.0.1.war
```

# Build Docker image

```bash
podman build -t ligoj/ligoj-ui:4.0.1 .
```

During the Docker build, the WAR file `ligoj-ui.war` is not copied from your local file system but from a previously released
remote location such as Nexus.
By default, the location
is `https://oss.sonatype.org/service/local/artifact/maven/redirect?r=public&g=org.ligoj.app&a=app-ui&v=4.0.1&p=war`.
In case of a custom build you can specify its remote or local location.

## Build with Docker builder (recommended)

With this mode, no build tools (Java, Maven, ...) are required to build the image.

```bash
podman build -t ligoj/ligoj-ui:4.0.1 --progress=plain -f Dockerfile .
```

It is also compatible with multiple target architectures:

```bash
podman build --platform linux/arm64 --platform linux/amd64 --manifest ligoj/ligoj-ui -t ligoj/ligoj-ui:4.0.1 -f Dockerfile .
```

## Custom Maven proxy

To use a custom Maven configuration (proxy, mirror, ...), copy your `settings.xml` Maven file into the `.m2/` directory.

Content will be copied at build time with a Docker `COPY` instruction.
The same applies to [app-api](../app-api/Dockerfile).

*Note*: This file will not be in the final Docker image, only in the builder image.

## Build behind a private Maven mirror with self-signed TLS

When the build must fetch artifacts from an internal mirror whose TLS certificate is
self-signed (or simply not in the JDK trust store), enable the `MAVEN_INSECURE_TLS`
build argument to disable Maven's HTTPS certificate and hostname validation:

```bash
docker build --build-arg MAVEN_INSECURE_TLS=true -t ligoj/ligoj-ui:4.0.1 -f Dockerfile .
```

When enabled, the builder stage exports the following `MAVEN_OPTS` for every `mvn`
invocation (dependency pre-fetch and final `package`):

- `-Dmaven.wagon.http.ssl.insecure=true` — accept any server certificate.
- `-Dmaven.wagon.http.ssl.allowall=true` — skip hostname verification.
- `-Dmaven.resolver.transport=wagon` — switch the resolver to the wagon transport so the two flags above take effect (Maven 3.9 defaults to the native HTTP transport, which ignores them).

The flag affects only the Maven stage. The Node/Vite stage is unchanged; configure
NPM TLS separately if needed (e.g. `npm config set strict-ssl false` in
`prepare-build.sh`). The flag is opt-in and defaults to `false`; released images are
built with full TLS verification.

> **Warning** — Only enable `MAVEN_INSECURE_TLS=true` against trusted mirrors on a
> trusted network. It removes all transport-level integrity guarantees and exposes
> the build to MitM-injected dependencies. Where possible, prefer importing the
> mirror's CA into the builder image via `prepare-build.sh`; a ready-to-use sample
> is provided in [`prepare-build-sample.sh`](prepare-build-sample.sh) — drop your
> PEM certificates in a `.ca/` directory and rename the script to `prepare-build.sh`.

# Run Docker image

```bash
podman run --rm -it \
  --name ligoj-ui \
  -e CUSTOM_OPTS='-Dsecurity=Trusted -Dlog.level=info' \
  -e ENDPOINT='http://host.containers.internal:8088/ligoj-api' \
  -e SERVER_PORT=8089 \
  -v ~/.ligoj:/home/ligoj \
  -p 8080:8089 \
  ligoj/ligoj-ui:4.0.1
```

Explanations:

- `-e ENDPOINT="..."`: API endpoint URL, default `http://ligoj-api:8081/ligoj-api`.
- `-e CUSTOM_OPTS="..."`: Security and logger options and other application features,
  see [Relevant variables](#relevant-variables).
- `-v ~/.ligoj:/home/ligoj`: External persistent volume for plugins and other data.
- `-p 8080:8089`: Expose the internal port `8089` to `8080`.

### Troubleshoot API access

You can experience network issues with remote/local APIs. To validate the link, try this:

```bash
podman run --rm -it \
--name "ligoj-ui" \
--network="host" \
ligoj/ligoj-ui:4.0.1 sh -c "curl http://127.0.0.1:8088/ligoj-api/manage/health"
```

## Endpoints

| Property                   | Endpoint                     | Default                         |
| -------------------------- | ---------------------------- | ------------------------------- |
| ligoj.endpoint             | Default base endpoint URL    | http://localhost:8081/ligoj-api |
| ligoj.endpoint.api.url     | Core API URL                 | ${ligoj.endpoint}/rest          |
| ligoj.endpoint.manage.url  | Health status and management | ${ligoj.endpoint}/manage        |
| ligoj.endpoint.plugins.url | Plug-ins API URL             | ${ligoj.endpoint}/webjars       |

## Run with security disabled

```bash
podman run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj/ligoj-ui:4.0.1
```

## Relevant variables

Docker environment variables

| Docker env   | Default value       | Note                                                                             |
| ------------ | ------------------- | -------------------------------------------------------------------------------- |
| CONTEXT      | `ligoj`             | Context, without starting '/'                                                    |
| SERVER_HOST  | `0.0.0.0`           | IP of the listening socket.                                                      |
| SERVER_PORT  | `8080`              | Passed to the server listening port and exposed port.                            |
| JAVA_MEMORY  | `-Xms128M -Xmx128M` | JVM Memory                                                                       |
| CUSTOM_OPTS  |                     | Additional JVM options, like `-D...`                                             |
| JAVA_OPTIONS | `-Dsecurity=Rest`   | Built from JAVA_OPTIONS, CUSTOM_OPTS and JAVA_MEMORY plus spring-boot properties |

Spring-Boot properties, injected in CUSTOM_OPTS
(In addition to endpoint properties)

| Name                            | Default value                              | Note                                                                                                                                                |
| ------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| server.port                     | `${SERVER_PORT}`                           | Server listening port inside the container.                                                                                                         |
| server.address                  | `${SERVER_HOST}`                           | IP of the listening socket.                                                                                                                         |
| server.servlet.context-path     | `/${CONTEXT}`                              | Context, starting '/'                                                                                                                               |
| security.max-sessions           | `1`                                        | Max concurrent session for one user, use `-1` for unlimited concurrency. FIFO policy is applied.                                                    |
| security                        | `Rest`                                     | `Trusted`, `Rest` or `OAuth2Bff`. See [Security](https://github.com/ligoj/ligoj/wiki/Security)                                                      |
| ligoj.sso.url                   | `${ligoj.endpoint.api.url}/security/login` | Authentication endpoint URL                                                                                                                         |
| ligoj.sso.content               | `{"name":"%s","password":"%s"}`            | SSO payload template.                                                                                                                               |
| app-env                         | `auto`                                     | Suffix for index and login HTML files, maybe `-prod`, `auto`, or empty. When `auto`, the suffix is guessed from the way the application is started. |
| log.http                        | `info`                                     | When `debug`, all HTTP queries are logged. Increases log file size.                                                                                 |
| log.level                       | `info`                                     | Configure log verbosity of all internal components: Spring and Jetty.                                                                               |
| ligoj.security.login-by-api-key | `false`                                    | Enable [login by API key](https://github.com/ligoj/ligoj/wiki/Security#login-by-api-key-provider)                                                   |

### System level-only variables

These variables are only relevant when set as Java System properties.
For example, `-Dvar=value` in the `CUSTOM_OPTS` Docker environment variable.

| Name                   | Default value      | Note                               |
| ---------------------- | ------------------ | ---------------------------------- |
| ligoj.log.file.name    | `./ui-rolling.log` | File inside `LIGOJ_HOME` directory |
| ligoj.log.file.size    | `10 MB`            | Max log file size                  |
| ligoj.log.file.enabled | `true`             | Enable log file                    |

## Compatibilities

### JSE

The source compatibility is 21 without preview features.

| Vendor  | Release | OS              |
| ------- | ------- | --------------- |
| Oracle  | 21      | Linux and MacOS |
| OpenJDK | 21      | Linux and MacOS |

# Developer mode

## Start Vite `app-ui` server

```shell
cd src/main/webapp
npm run dev
open http://localhost:5173/ligoj/
```

## Start Vite `plugin-ui` server

```shell
cd ~/git/ligoj-plugins/plugin-ui/ui
npm run build
npm run dev
```

## Start Vite `plugin-id` server

```shell
cd ~/git/ligoj-plugins/plugin-id/ui
npm run build
npm run dev
open http://localhost:5173/ligoj/
```
