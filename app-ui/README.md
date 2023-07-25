[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-ui.svg)](https://hub.docker.com/r/ligoj/ligoj-ui)

# UI (REST+JS) container running a stateful SpringBoot application.

Browser side roles :

- URL security level applied to UI component with hierarchy pruning. Can be overridden
- i18n

Server side roles :

- REST endpoints proxy
- White/secured URL
- Session holder

# Packaging (with Maven)

Compile Java sources, optionally minify sources (css/js) and package into the WAR file.
You can enable minified CSS/JS with the maven profile 'minify'. This requires 'clean-css-cli' NPM module.

```
npm install clean-css-cli -g
mvn clean package -Pminifiy -DskipTests=true
```

Note: you can run this command either from the root module, either from the "app-ui" module. When executed from the root
module, both WAR (app-api and app-ui) will be created.

# Test the WAR

Test the integration with a running API end-point

```
java -Dligoj.endpoint="http://192.168.4.138:8081/ligoj-api" -jar target/app-ui-3.2.3.war
```

# Build Docker image

```
docker build -t ligoj/ligoj-ui:3.2.3 .
```

During the Docker build, the WAR file "ligoj-ui.war" is not copied from your local FS but from a previously released
remote location such as Nexus.
By default, the location
is "https://oss.sonatype.org/service/local/artifact/maven/redirect?r=public&g=org.ligoj.app&a=app-ui&v=3.2.3&p=war"
In case of a custom build you can specify its remote or local location.

## Build with Docker builder (recommended)

With this mode, no build tools (Java, Maven,...) are required to build the image.

``` bash
docker build -t ligoj/ligoj-ui:3.2.3 --progress=plain -f Dockerfile .
podman build -t ligoj/ligoj-ui:3.2.3 --progress=plain -f Dockerfile .
```

Also, compatible with `podman`, and multiple target architectures:

``` bash
podman build --platform linux/arm64 --platform linux/amd64 --manifest ligoj/ligoj-ui -t ligoj/ligoj-ui:3.2.3 -f Dockerfile .
```

## Custom Maven proxy

When Maven dependencies from Internet are not reachable, custom Maven setting with proxy must be provided to Maven.

1. Create a `settings.xml` file
2. Uncomment the `COPY` command in `Dockerfile` (the same applies to [app-api](../app-api/Dockerfile)

# Run Docker image

```
docker run --rm -it \
  --name ligoj-ui \
  --network="host" \
  -e CUSTOM_OPTS='-Dsecurity=Trusted -Dlog4j2.level=info' \
  -e ENDPOINT='http://127.0.0.1:8088/ligoj-api' \
  -e SERVER_PORT=8089 \
  ligoj/ligoj-ui:3.2.3
```

Explanations:

- `-e CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key"`: Specify the SQL column cryptographic DES secret file. More
  information available
  there: [core-context-common.xml](https://github.com/ligoj/bootstrap/blob/5e23ac71c48bb89c8c44433bb4a89a30cbb4700c/bootstrap-core/src/main/resources/META-INF/spring/core-context-common.xml#L16C101-L16C101)
- `-e CUSTOM_OPTS="..."`: Security and logger options and other application features,
  see [Relevant variables](#relevant-variables)
- `-v ~/.ligoj:/home/ligoj \`: External persistent volume for plugins and other data.
- `-p 8680:8081`: Expose the internal port `8081` to `8680`

### Troubleshoot API access

You can experience network issue with remote/local API. To validate the link, try this :

``` bash
docker run --rm -it \
--name "ligoj-ui" \
--network="host" \
ligoj/ligoj-ui:3.2.3 sh -c "curl http://127.0.0.1:8088/ligoj-api/manage/health"
```

## Endpoints

| Property                   | Endpoint                     | Default                         |
|----------------------------|------------------------------|---------------------------------|
| ligoj.endpoint             | Default base endpoint URL    | http://localhost:8081/ligoj-api |
| ligoj.endpoint.api.url     | Core API URL                 | ${ligoj.endpoint}/rest          |
| ligoj.endpoint.manage.url  | Health status and management | ${ligoj.endpoint}/manage        |
| ligoj.endpoint.plugins.url | Plug-ins API URL             | ${ligoj.endpoint}/webjars       |

## Run with security disabled

```
docker run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj/ligoj-ui:3.2.3 
```

## Relevant variables

Docker environment variables

| Docker env   | Default value       | Note                                                                             |
|--------------|---------------------|----------------------------------------------------------------------------------|
| CONTEXT      | `ligoj`             | Context, without starting '/'                                                    |
| SERVER_HOST  | `0.0.0.0`           | IP of the listening socket.                                                      |
| SERVER_PORT  | `8080`              | Passed to server listening port and exposed port.                                |
| JAVA_MEMORY  | `-Xms128M -Xmx128M` | JVM Memory                                                                       |
| CUSTOM_OPTS  |                     | Additional JVM options, like -D...                                               |
| JAVA_OPTIONS | `-Dsecurity=Rest`   | Built from JAVA_OPTIONS, CUSTOM_OPTS and JAVA_MEMORY plus spring-boot properties |

Spring-Boot properties, injected in CUSTOM_OPTS
(In addition of endpoint properties)

| Name                        | Default value                              | Note                                                                                                                                              |
|-----------------------------|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| server.port                 | `${SERVER_PORT}`                           | Server listening port inside the container.                                                                                                       |
| server.address              | `${SERVER_HOST}`                           | IP of the listening socket.                                                                                                                       |
| server.servlet.context-path | `/${CONTEXT}`                              | Context, starting '/'                                                                                                                             |
| security.max-sessions       | `1`                                        | Max concurrent session for one user, "-1" unlimited                                                                                               |
| security                    | `Rest`                                     | `Trusted` or `Rest`. See [Security](https://github.com/ligoj/ligoj/wiki/Security)                                                                 |
| sso.url                     | `${ligoj.endpoint.api.url}/security/login` | Authentication end-point URL                                                                                                                      |
| sso.content                 | `{"name":"%s","password":"%s"}`            | SSO payload template.                                                                                                                             |
| app-env                     | `auto`                                     | Suffix for index and login HTML files, maybe `-prod`, `auto` or empty. When `auto`, the suffix is guessed from the way the application is started |
| log.http                    | `info`                                     | When `debug`, all HTTP queries are logged. Increase log files.                                                                                    |
| log4j2.level                | `info`                                     | Configure log verbosity of all internal components: Spring and Jetty                                                                              |

## Compatibilities

### JSE

The source compatibility is 17.

| Vendor  | Release | Status | Notes |
|---------|---------|--------|-------|
| Oracle  | 17      | OK     |       |
| OpenJDK | 17      | OK     |       |
| OpenJDK | 18      | OK     |       |
