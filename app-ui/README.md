[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-ui.svg)](https://hub.docker.com/r/ligoj/ligoj-ui)

# UI (REST+JS) container running a stateful SpringBoot application.

Browser side roles :

- URL security level applied to UI component with hierarchy pruning. Can be overridden
- i18n

Server side roles :

- REST endpoints proxing
- White/secured URL
- Session holder 

# Packaging (with Maven)

Compile Java sources, optionaly minify sources (css/js) and package into the WAR file.
You can enable minified CSS/JS with the maven profile 'minify'. This requires 'clean-css-cli' NPM module.

```
npm install clean-css-cli -g
mvn clean package -Pminifiy -DskipTests=true
```

Note: you can run this command either from the root module, either from the "app-ui" module. When executed from the root module, both WAR (app-api and app-ui) will be created.

# Test the WAR

Test the integration with a running API end-point

```
java -Dligoj.endpoint="http://192.168.4.138:8081/ligoj-api" -jar target/app-ui-3.1.0.war
```

# Build Docker image

```
docker build -t ligoj/ligoj-ui:3.1.0 .
```

During the Docker build, the WAR file "ligoj-ui.war" is not copied from your local FS but from a previously released remote location such as Nexus.
By default, the location is "https://oss.sonatype.org/service/local/artifact/maven/redirect?r=public&g=org.ligoj.app&a=app-ui&v=3.1.0&p=war"
In case of a custom build you can specify its remote or local location.

## Staged OSS build from Sonatype

```
docker build -t ligoj/ligoj-ui:3.1.0 --build-arg WAR="https://oss.sonatype.org/service/local/repositories/orgligoj-1087/content/org/ligoj/app/app-ui/3.1.0/app-ui-3.1.0.war" .
```

## Private remote build

```
docker build -t ligoj/ligoj-ui:3.1.0 --build-arg WAR="https://storage.company.com/releases/app-ui-3.1.0.war" .
```

## Local maven package

```
docker build -t ligoj/ligoj-ui:3.1.0 --build-arg WAR="target/app-ui-3.1.0.war" .
```

Note the local WAR path must be relative to the Dockerfile (not the current path), and must be below the Dockerfile: do not use "../bar/foo.war"

# Run Docker image

```
docker run --rm -it \
  --name ligoj-ui \
  -e ENDPOINT='http://192.168.4.138:8680/ligoj-api' \
  -p 8080:8080 \
  ligoj/ligoj-ui:3.1.0 
```

You can experience network issue with remote API. To validate the link, try this :

```
docker run --rm -it \
 --name "ligoj-ui" \
 ligoj/ligoj-ui:3.1.0 bash -c "apt-get install -y curl && curl --failed http://192.168.4.138:8081/ligoj-api/manage/health"
```

## Endpoints

| Property     | Endpoint | Default |
|------------|---------|--------------------------|
| ligoj.endpoint | Default base endpoint URL    | http://localhost:8081/ligoj-api |
| ligoj.endpoint.api.url | Core API URL     | ${ligoj.endpoint}/rest |
| ligoj.endpoint.manage.url | Health status and management| ${ligoj.endpoint}/manage |
| ligoj.endpoint.plugins.url | Plug-ins API URL | ${ligoj.endpoint}/webjars |


## Run with security disabled
```
docker run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj/ligoj-ui:3.1.0 
```


## Relevant variables

Docker environment variables given used to Java process

```
CONTEXT      : Context, without starting '/'
SERVER_HOST  : 0.0.0.0
SERVER_PORT  : 8080
JAVA_MEMORY  : JVM Memory
CUSTOM_OPTS  : Additional JVM options, like -D...
JAVA_OPTIONS : Built from JAVA_OPTIONS, CUSTOM_OPTS and JAVA_MEMORY plus spring-boot properties
```

Spring-Boot properties, injected in CUSTOM_OPTS
(In addition of endpoint properties)

```
server.port                 = ${SERVER_PORT}
server.address              = ${SERVER_HOST}
server.servlet.context-path = /${CONTEXT}
security.max-sessions       = "1" # max concurrent session for one user, "-1" unlimited
security                    = "Trusted" # or "Rest". See https://github.com/ligoj/ligoj/wiki/Security
sso.url                     = ${ligoj.endpoint.api.url}/security/login # Authentication end-point URL
sso.content                 = {"name":"%s","password":"%s"}
app-env                     = auto # Suffix for index and login HTML files, maybe "-prod", "auto" or empty. When "auto", the suffix is guessed from the way the application is started
log.http                    = info # When "debug", all HTTP queries are logged. Increase log files.
```

## Compatibilities

### JSE

The source compatibility is 11 to 13.

| Vendor     | Release  | Status  | Notes |
|------------|----------|---------|-------|
| Oracle     | 11       | OK      | You have to rebuild from the source |
| OpenJDK    | 11       | OK      | You have to rebuild from the source |
| Oracle     | 12       | OK      | You have to rebuild from the source |
| OpenJDK    | 12       | OK      | You have to rebuild from the source |
| Oracle     | 13       | OK      |  |
| OpenJDK    | 13       | OK      |  |
