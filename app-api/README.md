[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-api.svg)](https://hub.docker.com/r/ligoj/ligoj-api)

# API (REST) container running a stateless SpringBoot application.

## Roles

- URL security level, with RBAC: User / Role / Permission for a URL pattern supporting dynamic configuration
- Resource security level (most complex) gives to users, groups and companies can access (read, write, +grant) to nodes,
  users, groups, companies
- plugin runtime and life-cycle management

## API Schema

When the API container is exposed (not for production), schemas are available.

### OpenAPI

```bash
curl 'http://localhost:8081/ligoj-api/rest/openapi.json' -H 'SM_UniversalID: ligoj-admin'
```

Sample result

```json
{
  "openapi": "3.0.1",
  "servers": [
    {
      "url": "http://localhost:8081/ligoj-api/rest"
    }
  ],
  "paths": {
    "/service/id/company": {
      "get": {
        "operationId": "findAll_20",
        "responses": {
          "default": {
            "description": "default response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TableItemContainerCountVo"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### WADL

WADL format currently outputs only XML.

```bash
curl 'http://localhost:8081/ligoj-api/rest?_wadl' -H 'SM_UniversalID: ligoj-admin'
```

Sample result

```xml

<application xmlns="http://wadl.dev.java.net/2009/02">
    <resources base="http://localhost:8081/ligoj-api/rest/">
        <resource path="/security">
            <resource path="/login">
                <method name="POST">
                    <request>
                        <representation mediaType="application/json"/>
                    </request>
                    <response>
                        <representation mediaType="application/json"/>
                    </response>
                </method>
            </resource>
        </resource>
    </resources>
</application>
```

# Test the application

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--user.timezone=UTC,--jpa.hbm2ddl=none,--ligoj.plugin.enabled=false,--jdbc.host=ligoj-db
```

# Packaging (with Maven)

Compile Java sources and produce the WAR file.

```bash
mvn clean package -DskipTests=true
```

Note: you can run this command either from the root module, either from the `app-api` module. When executed from the
root module, both WAR (`app-api` and `app-ui`) will be created. But if you want to produce production binaries, enable
the "minify" profile `minify`.

# Test the WAR

```bash
java -Xmx1024M -Duser.timezone=UTC -Djpa.hbm2ddl=none -Dligoj.plugin.enabled=false -Djdbc.host=ligoj-db -jar target/app-api-4.0.1.war
```

# Build Docker image

## Build with Docker builder

With this mode, no build tools (java, Maven, ...) are required to build the image.

```bash
docker build -t ligoj/ligoj-api:4.0.1 -f Dockerfile .
```

Also, compatible with `podman`, and multiple target architectures:

```bash
podman build --platform linux/arm64 --platform linux/amd64 --manifest ligoj/ligoj-api -t ligoj/ligoj-api:4.0.1 -f Dockerfile .
```

## Custom Maven proxy

To use a custom Maven configuration (proxy, mirror, ...), copy your `settings.xml` Maven file in `.m2/` directory.

Content will be copied at build time with a Docker `COPY` instruction.
The same applies to [app-ui](../app-ui/Dockerfile)

*Note* This file will be in the final Docker image, only in the builder image.

# Prepare database

## New MySQL database in container

```bash
docker run -d \
--name ligoj-db \
-p 3306:3306 \
-e MYSQL_RANDOM_ROOT_PASSWORD=yes \
-e MYSQL_DATABASE=ligoj \
-e MYSQL_USER=ligoj \
-e MYSQL_PASSWORD=ligoj \
mysql:8.0.35
```

## Existing MySQL server

```bash
mysql --user=root
```

```sql
CREATE DATABASE `ligoj` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_bin;
CREATE USER 'ligoj'@'localhost' IDENTIFIED BY 'ligoj';
GRANT ALL ON `ligoj`.* TO 'ligoj'@'localhost';
FLUSH PRIVILEGES;
```

## Existing PgSQL server

```bash
sudo su postgres
psql ligoj
\c ligoj
```

### PgSQL up to 14

```sql
CREATE USER ligoj WITH ENCRYPTED PASSWORD 'ligoj';
CREATE DATABASE ligoj WITH OWNER=ligoj ENCODING='UTF-8';
GRANT ALL PRIVILEDGES ON DATABASE ligoj to ligoj
```

### PgSQL 15+

```sql
CREATE USER ligoj WITH ENCRYPTED PASSWORD 'ligoj';
CREATE DATABASE ligoj WITH OWNER=ligoj ENCODING='UTF-8';
GRANT ALL ON DATABASE ligoj to ligoj;
GRANT ALL ON SCHEMA public TO ligoj;
```

# Run Docker image

## Start the API container linked to the database container (Option1)

```bash
docker run --rm -it \
  --name ligoj-api \
  -e CUSTOM_OPTS='-Djpa.hbm2ddl=update -Djdbc.port=3307 -Djdbc.host=ligoj-db -Dligoj.initial.user.action=init' \
  ligoj/ligoj-api:4.0.1
```

## Start the API container linked to an external database (Option2)

```bash
docker run --rm -it \
 --name "ligoj-api" \
 --network "host" \
 -e CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.port=3307 -Djdbc.host=localhost' \
 ligoj/ligoj-api:4.0.1
```

## More options

### MySQL and crypto sample

More complex run with crypto, port mapping, disabled schema generation and volume configurations

```bash
docker run --rm -it \
 --name "ligoj-api" \
 --network "host" \
 -e CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key" \
 -e CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password=ligoj -Djpa.hbm2ddl=none -Djdbc.host=localhost' \
 -v ~/.ligoj:/home/ligoj \
 -p 8680:8081 \
 ligoj/ligoj-api:4.0.1
```

Explanations:

- `-e CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key"`: Specify the SQL column cryptographic DES secret file. More
  information is available
  there: [core-context-common.xml](https://github.com/ligoj/bootstrap/tree/master/bootstrap-core/src/main/resources/META-INF/spring/core-context-common.xml#L16C101-L16C101)
- `-e CUSTOM_OPTS="..."`: Options related to database, and other application features,
  see [Relevant variables](#relevant-variables)
- `-v ~/.ligoj:/home/ligoj \`: External persistent volume for plugins and other data.
- `-p 8680:8081`: Exposition of the internal port `8081` to `8680`

Note: On Windows host, replace all `` \ `` (escape) by `` ` `` for multi-line support.

### PgSQL sample

More complex run with system properties for LDAP (see [plugin-id-ldap](https://github.com/ligoj/plugin-id-ldap)) and
custom ORM dialect

```bash
docker run --rm \
--name "ligoj-api" \
--network="host" \
--detach \
-e SERVER_PORT=8088 \
-e CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password=ligoj -Djpa.hbm2ddl=update -Djdbc.host=127.0.0.1 -Djdbc.vendor=postgresql -Djdbc.port=5432 -Djpa.dialect=org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect -Djdbc.driverClassName=org.postgresql.Driver -Dcom.sun.jndi.ldap.connect.pool.initsize=1 -Dcom.sun.jndi.ldap.connect.pool.maxsize=1 -Dcom.sun.jndi.ldap.connect.pool.prefsize=1 -Dcom.sun.jndi.ldap.connect.pool.debug=all' \
-v /var/lib/instance_datas/ligoj:/home/ligoj \
 ligoj/ligoj-api:4.0.1
```

Note: There is an uncovered Hibernate issue with schema generation `update` mode. The configured database user must see
only the target database. If there are several visible databases by this user, the update mechanism will populate the
tables of all visible tables, including the ones of the not targeted database. This strategy may produce an empty SQL
schema update when some tables are already existing in a database different from the target one.

### Administrator user reinitialisation

By default, the user `ligoj-admin` is created at the first start assigned to the role `ADMIN`, and this behavior can be configured with `ligoj.initial.user.*` properties.

#### Scenario #1

Constraints:

- Instead of the user `ligoj-admin`, create `some-user`.
- Assign this user to a role `Administrators`
- Create an API token named `init_token`
- Print this token value in the console only on the first start

Options to set:

- `ligoj.initial.user.name`: `some-user`
- `ligoj.initial.user.action`: `init`
- `ligoj.initial.user.role`: `Administrators`
- `ligoj.initial.user.token.name`: `init_token`

#### Scenario #2

Constraints:

- Instead of the user `ligoj-admin`, create `some-user`.
- Assign this user to a role `Administrators`
- Create an API token named `init_token`
- Replace this token by a value `SECRET` (this value will not be printed)

Options to set:

- `ligoj.initial.user.name`: `some-user`
- `ligoj.initial.user.action`: `reset`
- `ligoj.initial.user.role`: `Administrators`
- `ligoj.initial.user.token.name`: `init_token`
- `ligoj.initial.user.token.value`: `SECRET`

### Troubleshoot database access

You can experience network issue with a remote database. To validate the link, try this :

#### MySQL

```bash
docker run --rm -it \
 --name "ligoj-api" \
 ligoj/ligoj-api:4.0.1 sh -c "apk add mysql-client && mysql -h 192.168.1.16 --user=ligoj --password=ligoj ligoj"
```

#### PostgreSQL

```bash
docker run --rm -it \
 --name "ligoj-api" \
 ligoj/ligoj-api:4.0.1 sh -c "apk add postgresql-client && psql --host 192.168.1.13 --username=ligoj --password ligoj"
```

## Relevant variables

Docker environment variables

| Docker env   | Default value                  | Note                                                                             |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------- |
| CRYPTO       | `-Dapp.crypto.password=public` | Secret AES configuration. See                                                    |
| CONTEXT      | `ligoj`                        | Context, without starting '/'                                                    |
| SERVER_HOST  | `0.0.0.0`                      | IP of the listening socket.                                                      |
| SERVER_PORT  | `8081`                         | Passed to server listening port and exposed port.                                |
| JAVA_MEMORY  | `-Xms128M -Xmx128M`            | JVM Memory                                                                       |
| CUSTOM_OPTS  |                                | Additional JVM options, like -D...                                               |
| JAVA_OPTIONS |                                | Built from JAVA_OPTIONS, CUSTOM_OPTS and JAVA_MEMORY plus spring-boot properties |

Java properties (injected in CUSTOM_OPTS with -Dxxx=yyyy) and Spring-Boot properties (can be injected in `CUSTOM_OPTS`)
and can be dynamically modified from the administration
console:

| Name                                                  | Default value                                                                                                                                                                 | Note                                                                                                                                                                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| app.crypto.file                                       |                                                                                                                                                                               | Secret file location. Can also be defined in `APP_CRYPTO_FILE`environment variable.                                                                                                                                               |
| app.crypto.password                                   |                                                                                                                                                                               | Secret value. Can also be defined in `APP_CRYPTO_PASSWORD`environment variable.                                                                                                                                                   |
| cache.location                                        | `classpath:META-INF/hazelcast-local.xml`                                                                                                                                      | Custom Hazelcast configuration file location                                                                                                                                                                                      |
| cache.${cache_name}.ttl                               |                                                                                                                                                                               | For each cache, built-in default TTL can be adjusted. The identifier replacing `${cache_name}` can be listed from the administration page                                                                                         |
| feature:iam:node:primary                              | `empty`                                                                                                                                                                       | Ligoj `plugin-id` node's identifier used as primary IAM provider. See [plugin-iam-node](https://github.com/ligoj/plugin-iam-node) for more information. `empty` provider is a read-only provider accepting all authentications.   |
| feature:iam:node:secondary                            | `secondary`                                                                                                                                                                   | Ligoj `plugin-id` node's identifier used as secondary IAM provider. See [plugin-iam-node](https://github.com/ligoj/plugin-iam-node) for more information. `empty` provider is a read-only provider accepting all authentications. |
| global.tools.external                                 | ``                                                                                                                                                                            | Ligoj `plugin-id` node's identifiers globally available for external users.                                                                                                                                                       |
| global.tools.internal                                 | ``                                                                                                                                                                            | Ligoj `plugin-id` node's globally available for internal users.                                                                                                                                                                   |
| health.node                                           | `0 0 0/1 1/1 * ?`                                                                                                                                                             | CRON expression to refresh the health of the nodes                                                                                                                                                                                |
| health.subscription                                   | `0 0 2 1/1 * ?`                                                                                                                                                               | CRON expression to refresh the health of the subscriptions                                                                                                                                                                        |
| jdbc.vendor                                           | `mysql`                                                                                                                                                                       | Database type: `mysql`, `postgresql`, `mariadb`                                                                                                                                                                                   |
| jdbc.port                                             | `3306`                                                                                                                                                                        |                                                                                                                                                                                                                                   |
| jdbc.database                                         | `ligoj`                                                                                                                                                                       |                                                                                                                                                                                                                                   |
| jdbc.username                                         | `ligoj`                                                                                                                                                                       |                                                                                                                                                                                                                                   |
| jdbc.password                                         | `ligoj`                                                                                                                                                                       |                                                                                                                                                                                                                                   |
| jdbc.host                                             | `localhost`                                                                                                                                                                   |                                                                                                                                                                                                                                   |
| jdbc.driverClassName                                  | `com.mysql.cj.jdbc.Driver`                                                                                                                                                    | Java class name of the driver: `org.postgresql.Driver`                                                                                                                                                                            |
| jdbc.urlparam                                         | [JDBC URL Params](?useColumnNamesInFindColumn=true&useUnicode=yes&characterEncoding=UTF-8&autoReconnect=true&maxReconnects=10&useLegacyDatetimeCode=false&serverTimezone=UTC) | JDBC URL parameters for the connection.                                                                                                                                                                                           |
| jdbc.url                                              | [JDBC URL](jdbc:${jdbc.vendor}://${jdbc.host}:${jdbc.port}/${jdbc.database}${jdbc.urlparam:})                                                                                 |                                                                                                                                                                                                                                   |
| jdbc.validationQuery                                  | `select 1;`                                                                                                                                                                   |                                                                                                                                                                                                                                   |
| jdbc.maxIdleTime                                      | `180000`                                                                                                                                                                      |                                                                                                                                                                                                                                   |
| jdbc.maxPoolSize                                      | `150`                                                                                                                                                                         |                                                                                                                                                                                                                                   |
| jpa.dialect                                           | `org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect`                                                                                                                        | Java class name of the dialect: org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect                                                                                                                                          |
| jpa.hbm2ddl                                           | `update`                                                                                                                                                                      | update, none, validate. With "update", the server takes up to 30s to start                                                                                                                                                        |
| jpa.log_queries_slower_than_ms                        | `0`                                                                                                                                                                           | Minimal cost of logged slow Hibernate queries. `0`to disable it.                                                                                                                                                                  |
| jpa.generate_statistics                               | `false`                                                                                                                                                                       | When `true` Hibernate statistics are logged.                                                                                                                                                                                      |
| management.context-path                               | `/manage`                                                                                                                                                                     |                                                                                                                                                                                                                                   |
| management.security.roles                             | `USER`                                                                                                                                                                        | Default RBAC role assigned to new user.                                                                                                                                                                                           |
| ligoj.initial.user.action                             | ``                                                                                                                                                                            | When `init`, the initialization is executed once. When `reset`, its execution is forced.                                                                                                                                          |
| ligoj.initial.user.name                               | `ligoj-admin`                                                                                                                                                                 | The initial user name.                                                                                                                                                                                                            |
| ligoj.initial.user.role                               | `ADMIN`                                                                                                                                                                       | The initial role name to associate to the initial user.                                                                                                                                                                           |
| ligoj.initial.user.token.name                         | `auto-install`                                                                                                                                                                | The API token name to associate to the initial user.                                                                                                                                                                              |
| ligoj.initial.user.token.value                        | ``                                                                                                                                                                            | When defined, the API token value is forced to the given value, and not printed. Otherwise, a generated value is set and printed in log: `[INIT] Token '..' has been set for initial user '..' to value: ..`                      |
| ligoj.hook.path                                       | `^$`                                                                                                                                                                          | Hook (`/system/hook`) commands must match with one of the path of this list. Comma separated RegEx. Checked at creation and execution time.                                                                                       |
| ligoj.file.path                                       | `^$`                                                                                                                                                                          | File (`/system/file`) paths must match with one of the path of this list. Comma separated RegEx. Checked at download and upload time.                                                                                             |
| ligoj.plugin.enabled                                  | `true`                                                                                                                                                                        | When false, plugins are not loaded and their state is not updated                                                                                                                                                                 |
| ligoj.plugin.ignore                                   | `plugin-password-management`                                                                                                                                                  | Filtered (deprecated, fixed version, ...) plugins for install or update from the repositories                                                                                                                                     |
| ligoj.plugin.install                                  | ``                                                                                                                                                                            | List plugin identifiers to install: `plugin1,plugin2,...`. These plugins are automatically installed at boot time. Update are performed according to "ligoj.plugin.update" option                                                 |
| ligoj.plugin.update                                   | `false`                                                                                                                                                                       | When `true`, the plugins are updated automatically at boot time to the latest available version.                                                                                                                                  |
| ligoj.plugin.repository                               | `central`                                                                                                                                                                     | Repository identifier used to query plugin install or update.  May be `central`, `nexus`                                                                                                                                          |
| ligoj.sslVerify                                       | `true`                                                                                                                                                                        | When `false`, the standards SSL verification suf as domain name, certifications chain and validity are disabled. Useful for self-signed certificates.                                                                             |
| logging.level.root                                    | `info`                                                                                                                                                                        | Configure default log verbosity of all internal components: Spring, Jetty, Hibernate,...                                                                                                                                          |
| logging.level.<category>                              | *vary*                                                                                                                                                                        | Configure default log verbosity a specific category                                                                                                                                                                               |
| plugins.repository-manager.${repository}.search.url   | *depends on repository*                                                                                                                                                       | URL template to discover plugins.                                                                                                                                                                                                 |
| plugins.repository-manager.${repository}.artifact.url | *depends on repository*                                                                                                                                                       | URL template to download plugins.                                                                                                                                                                                                 |
| plugins.repository-manager.${repository}.groupId      | `org.ligoj.plugin`                                                                                                                                                            | Maven `groupId` to filter the Ligoj plugins                                                                                                                                                                                       |
| server.port                                           | `${SERVER_PORT}`                                                                                                                                                              |                                                                                                                                                                                                                                   |
| server.address                                        | `${SERVER_HOST}`                                                                                                                                                              |                                                                                                                                                                                                                                   |
| server.servlet.context-path                           | `/${CONTEXT}`                                                                                                                                                                 |                                                                                                                                                                                                                                   |
| LIGOJ_HOOK_TIMEOUT                                    | `30`                                                                                                                                                                          | Hook timeout in seconds                                                                                                                                                                                                           |

### System level-only variables

These variables are only relevant when set as Java System property.
For sample `-Dvar=value` in `CUSTOM_OPTS` Docker environment variable

| Name                   | Default value       | Note                               |
| ---------------------- | ------------------- | ---------------------------------- |
| ligoj.log.file.name    | `./api-rolling.log` | File inside `LIGOJ_HOME` directory |
| ligoj.log.file.size    | `10 MB`             | Max log file size                  |
| ligoj.log.file.enabled | `true`              | Enablement of log file             |

## Compatibilities

### Database

Tested compatibility and performance for 10K+ users and 1K+ projects.

| Vendor                                    | Version | Driver                   | Dialect                                                  | Status                  |
| ----------------------------------------- | ------- | ------------------------ | -------------------------------------------------------- | ----------------------- |
| [MySQL](https://www.mysql.com)            | 5.5     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MySQL](https://www.mysql.com)            | 5.6     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MySQL](https://www.mysql.com)            | 5.7     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MySQL](https://www.mysql.com)            | 8.0     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL8InnoDBUtf8Dialect     | OK                      |
| [MariaDB](https://mariadb.org/)           | 10.1    | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MariaDB](https://mariadb.org/)           | 10.1    | org.mariadb.jdbc.Driver  | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK, unknown performance |
| [PostGreSQL](https://www.postgresql.org/) | 9.6     | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |
| [PostGreSQL](https://www.postgresql.org/) | 10.21   | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |
| [PostGreSQL](https://www.postgresql.org/) | 15.1    | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |
| [PostGreSQL](https://www.postgresql.org/) | 17.0    | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |

### JSE

The source compatibility is 21 without preview features.

| Vendor  | Release | OS              |
| ------- | ------- | --------------- |
| Oracle  | 21      | Linux and MacOS |
| OpenJDK | 21      | Linux and MacOS |

# Management endpoints

The following commands are only available in development mode, with exposed API:

```bash
curl -H "SM_UniversalID:ligoj-admin" http://localhost:8081/ligoj-api/manage/info
```

```json
{
  "app": {
    "name": "Ligoj - API",
    "description": "Ligoj API container",
    "version": "4.0.1",
    "groupId": "org.ligoj.app",
    "artifactId": "app-api"
  },
  "java": {
    "version": "17.0.3",
    "vendor": {
      "name": "Eclipse Adoptium",
      "version": "Temurin-17.0.3+7"
    },
    "runtime": {
      "name": "OpenJDK Runtime Environment",
      "version": "17.0.3+7"
    },
    "jvm": {
      "name": "OpenJDK 64-Bit Server VM",
      "vendor": "Eclipse Adoptium",
      "version": "17.0.3+7"
    }
  },
  "os": {
    "name": "Mac OS X",
    "version": "13.5.2",
    "arch": "aarch64"
  }
}
```

