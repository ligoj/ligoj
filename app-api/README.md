[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-api.svg)](https://hub.docker.com/r/ligoj/ligoj-api)

# API (REST) container running a stateless SpringBoot application.

Roles :
- URL security level, with RBAC : User / Role / Permission for a URL pattern supporting dynamic configuration
- Resource security level (most complex) giving to users, groups and companies an access (read, write, +grant) to nodes, users, groups, companies
- Plug-in runtime and life-cycle management


# Test the application

```
mvn spring-boot:run -Dspring-boot.run.arguments=--user.timezone=UTC,--jpa.hbm2ddl=none,--ligoj.plugin.enabled=false,--jdbc.host=ligoj-db
```

# Packaging (with Maven)
Compile Java sources and produce the WAR file.

```
mvn clean package -DskipTests=true
```

Note: you can run this command either from the root module, either from the "app-api" module. When executed from the root module, both WAR (app-api and app-ui) will be created. But if you want to produce production binaries, enable the "minify" profile "-Pminify".

# Test the WAR

```
java -Xmx1024M -Duser.timezone=UTC -Djpa.hbm2ddl=none -Dligoj.plugin.enabled=false -Djdbc.host=ligoj-db -jar target/app-api-3.2.3.war
```

# Build Docker image

## Build with Docker builder (recommended)

With this mode, no build tools (java, Maven,...) are required to build the image.

``` bash
docker build -t ligoj/ligoj-api:3.2.3 -f Dockerfile.build .
```

Also, compatible with `podman`, and multiple target architecture:

``` bash
podman build --platform linux/arm64 --platform linux/amd64 --manifest $MANIFEST_NAME -t ligoj/ligoj-api:3.2.3 -f Dockerfile.build .
```

## Custom builds

### Custom URL

During the build, the WAR file "ligoj-api.war" is not copied from your local FS but from a previously released remote location such as Nexus.
By default, the location is "https://oss.sonatype.org/service/local/artifact/maven/redirect?r=public&g=org.ligoj.app&a=app-api&v=3.2.3&p=war"
In case of a custom build you can specify its remote or local location.

Staged OSS build from Sonatype

```
docker build -t ligoj/ligoj-api:3.2.3 --build-arg WAR="https://oss.sonatype.org/service/local/repositories/orgligoj-1087/content/org/ligoj/app/app-api/3.2.3/app-api-3.2.3.war" .
```

Private remote build

```
docker build -t ligoj/ligoj-api:3.2.3 --build-arg WAR="https://storage.company.com/releases/app-api-3.2.3.war" .
```

Reuse the local maven package

```
docker build -t ligoj/ligoj-api:3.2.3 --build-arg WAR="target/app-api-3.2.3.war" .
```

Note the local WAR path must be relative to the `Dockerfile` (not the current path), and must be below the `Dockerfile`: do not use `../bar/foo.war`

# Run Docker image

## Start the API container linked to the database container (Option1)

```
docker run -d \
  --name ligoj-db \
  -p 3306:3306 \
  -e MYSQL_RANDOM_ROOT_PASSWORD=yes \
  -e MYSQL_DATABASE=ligoj \
  -e MYSQL_USER=ligoj \
  -e MYSQL_PASSWORD=ligoj \
  mysql:5.6
docker run --rm -it \
  --name ligoj-api \
  -e CUSTOM_OPTS='-Djpa.hbm2ddl=update -Djdbc.host=ligoj-db' \
  ligoj/ligoj-api:3.2.3 
```

## Start the API container linked to an external database (Option2)

```
docker run --rm -it \
 --name "ligoj-api" \
 -e CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password="ligoj" -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138' \
 ligoj/ligoj-api:3.2.3
```

### Troubleshoot database access
You can experience network issue with remote database. To validate the link, try this :

#### MySQL
```
docker run --rm -it \
 --name "ligoj-api" \
 ligoj/ligoj-api:3.2.3 sh -c "apk add mysql-client && mysql -h 192.168.4.138 --user=ligoj --password=ligoj ligoj"
```

#### PostgreSQL
```
docker run --rm -it \
 --name "ligoj-api" \
 ligoj/ligoj-api:3.2.3 sh -c "apk add postgresql-client && psql --host 192.168.1.13 --username=ligoj --password ligoj"
```

### Column level crypto in database

More complex run with crypto, port mapping, disabled schema generation and volume configurations

```
docker run --rm -it \
 --name "ligoj-api" \
 -e CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key" \
 -e CUSTOM_OPTS="-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password=ligoj -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138 \
 -v ~/.ligoj:/home/ligoj \
 -p 8680:8081 \
 ligoj/ligoj-api:3.2.3
```

Note: On Windows host, replace all \ (escape) by ` for multi-line support.

Note: There is an uncovered Hibernate issue with schema generation `update` mode. The configured database user must see only the target database. If there are several visible databases by this user, the update mechanism will populate the tables of all visible tables, including the ones of the not targeted database. This strategy may produce an empty SQL schema update when some tables are already existing in a database different from the target one.

## Relevant variables


```
CONTEXT      : Context, without starting '/'
SERVER_HOST  : 0.0.0.0
SERVER_PORT  : 8081
JAVA_MEMORY  : JVM Memory
CRYPTO       : Secret AES file loacation for secured application data
CUSTOM_OPTS  : Additional JVM options, like -D...
JAVA_OPTIONS : Built from JAVA_OPTIONS, CUSTOM_OPTS and JAVA_MEMORY plus spring-boot properties
jdbc.url     : DB URL
jdbc.username: DB user
jdbc.password: DB password
```

Java properties (injected in CUSTOM_OPTS with -Dxxx=yyyy):

```
user.timezone = UTC
log.sql       = info # When "debug", all SQL queries are logged. Increase log files.
log.http      = info # When "debug", all HTTP queries are logged. Increase log files.
```

Spring-Boot properties (injected in CUSTOM_OPTS):

```
app.crypto.file             = Secret file location
cache.location              = classpath:META-INF/hazelcast-local.xml # Custom Hazelcast configuration file location.
health.node                 = 0 0 0/1 1/1 * ?
health.subscription         = 0 0 2 1/1 * ?
jpa.hbm2ddl                 = <[update],none,validate> # With "update", the server takes up to 30s to start
jdbc.vendor                 = <[mysql],postgresql,mariadb>
jdbc.port                   = 3306
jdbc.database               = ligoj
jdbc.username               = ligoj
jdbc.password               = ligoj
jdbc.host                   = localhost
jpa.dialect                 = <[org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect],org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect>
jdbc.driverClassName        = <[com.mysql.cj.jdbc.Driver],org.postgresql.Driver>
jdbc.urlparam               = ?useColumnNamesInFindColumn=true&useUnicode=yes&characterEncoding=UTF-8&autoReconnect=true&maxReconnects=10&useLegacyDatetimeCode=false&serverTimezone=UTC
jdbc.url                    = jdbc:${jdbc.vendor}://${jdbc.host}:${jdbc.port}/${jdbc.database}${jdbc.urlparam:}
jdbc.validationQuery        = select 1;
jdbc.maxIdleTime            = 180000
jdbc.maxPoolSize            = 150
ligoj.plugin.enabled        = <false,[true]> # When false, plug-ins are not loaded and their state is not updated
ligoj.plugin.update         = <false,[true]> # When true, on startup, the plug-in are updated to the latest available version
ligoj.plugin.repository     = <[central],nexus> # The default repository used to perform the plug-in update/install
ligoj.plugin.ignore         = plugin-password-management # Filtered (deprecated, fixed version, ...) plug-ins for install or update from the repositories
ligoj.plugin.install        = # Comma separated plug-ins  to install on startup. Update are performed according to "ligoj.plugin.update" option
log4j2.level                = info # Configure log verbositoy of all internal components: Spring, Jetty, Hibernate,...
management.context-path     = /manage
management.security.roles   = USER
server.port                 = ${SERVER_PORT}
server.address              = ${SERVER_HOST}
server.servlet.context-path = /${CONTEXT}
```

## Compatibilities

### Database

Tested compatibility and performance for 10K+ users and 1K+ projects.

| Vendor                                    | Version | Driver                   | Dialect                                                  | Status                  |
|-------------------------------------------|---------|--------------------------|----------------------------------------------------------|-------------------------|
| [MySQL](https://www.mysql.com)            | 5.5     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | A bit slow in plugin-id |
| [MySQL](https://www.mysql.com)            | 5.6     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MySQL](https://www.mysql.com)            | 5.7     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | Slow in plugin-id       |
| [MySQL](https://www.mysql.com)            | 8.0     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL8InnoDBUtf8Dialect     | OK                      |
| [MariaDB](https://mariadb.org/)           | 10.1    | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | Slow in plugin-id       |
| [MariaDB](https://mariadb.org/)           | 10.1    | org.mariadb.jdbc.Driver  | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK, unknown performance |
| [PostGreSQL](https://www.postgresql.org/) | 9.6     | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | A bit slow in plugin-id |
| [PostGreSQL](https://www.postgresql.org/) | 10.21   | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | A bit slow in plugin-id |

### JSE


| Vendor     | Release | Status   | Notes  |
|------------|---------|----------|--------|
| Oracle     | 17      | OK       |        |
| OpenJDK    | 17      | OK       |        |
| OpenJDK    | 18      | OK       |        |
