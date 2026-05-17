[![Docker](https://img.shields.io/docker/build/ligoj/ligoj-api.svg)](https://hub.docker.com/r/ligoj/ligoj-api)

# API (REST) container running a stateless Spring Boot application.

## Roles

- URL security level, with RBAC: User / Role / Permission for a URL pattern supporting dynamic configuration.
- Resource security level (the most complex) allows users, groups, and companies to access (read, write, and grant) nodes, users, groups, and companies.
- Plugin runtime and lifecycle management.

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

Note: You can run this command either from the root module or from the `app-api` module. When executed from the root module, both WARs (`app-api` and `app-ui`) will be created.

# Test the WAR

```bash
java -Xmx1024M -Duser.timezone=UTC -Djpa.hbm2ddl=none -Dligoj.plugin.enabled=false -Djdbc.host=ligoj-db -jar target/app-api-4.0.1.war
```

# Build Docker image

## Build with Docker builder

With this mode, no build tools (Java, Maven, ...) are required to build the image.

```bash
docker build -t ligoj/ligoj-api:4.0.1 -f Dockerfile .
```

It is also compatible with multiple target architectures:

```bash
podman build --platform linux/arm64 --platform linux/amd64 --manifest ligoj/ligoj-api -t ligoj/ligoj-api:4.0.1 -f Dockerfile .
```

## Custom Maven proxy

To use a custom Maven configuration (proxy, mirror, ...), copy your `settings.xml` Maven file into the `.m2/` directory.

Content will be copied at build time with a Docker `COPY` instruction.
The same applies to [app-ui](../app-ui/Dockerfile).

*Note*: This file will not be in the final Docker image, only in the builder image.

## Build behind a private Maven mirror with self-signed TLS

When the build must fetch artifacts from an internal mirror whose TLS certificate is
self-signed (or simply not in the JDK trust store), enable the `MAVEN_INSECURE_TLS`
build argument to disable Maven's HTTPS certificate and hostname validation:

```bash
docker build --build-arg MAVEN_INSECURE_TLS=true -t ligoj/ligoj-api:4.0.1 -f Dockerfile .
```

When enabled, the builder stage exports the following `MAVEN_OPTS` for every `mvn`
invocation (dependency pre-fetch and final `package`):

- `-Dmaven.wagon.http.ssl.insecure=true` — accept any server certificate.
- `-Dmaven.wagon.http.ssl.allowall=true` — skip hostname verification.
- `-Dmaven.resolver.transport=wagon` — switch the resolver to the wagon transport so the two flags above take effect (Maven 3.9 defaults to the native HTTP transport, which ignores them).

The flag is opt-in and defaults to `false`. Released images are built with full TLS
verification.

> **Warning** — Only enable `MAVEN_INSECURE_TLS=true` against trusted mirrors on a
> trusted network. It removes all transport-level integrity guarantees and exposes
> the build to MitM-injected dependencies. Where possible, prefer importing the
> mirror's CA into the builder image via `prepare-build.sh`; a ready-to-use sample
> is provided in [`prepare-build-sample.sh`](prepare-build-sample.sh) — drop your
> PEM certificates in a `.ca/` directory and rename the script to `prepare-build.sh`.

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
GRANT ALL PRIVILEGES ON DATABASE ligoj TO ligoj;
```

### PgSQL 15+

```sql
CREATE USER ligoj WITH ENCRYPTED PASSWORD 'ligoj';
CREATE DATABASE ligoj WITH OWNER=ligoj ENCODING='UTF-8';
GRANT ALL ON DATABASE ligoj TO ligoj;
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

More complex run with crypto, port mapping, disabled schema generation, and volume configurations:

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
  [here](https://github.com/ligoj/bootstrap/tree/master/bootstrap-core/src/main/resources/META-INF/spring/core-context-common.xml#L16C101-L16C101).
- `-e CUSTOM_OPTS="..."`: Options related to the database and other application features.
  See [Relevant variables](#relevant-variables).
- `-v ~/.ligoj:/home/ligoj`: External persistent volume for plugins and other data.
- `-p 8680:8081`: Exposes the internal port `8081` to `8680`.

Note: On Windows host, replace all `` \ `` (escape) by `` ` `` for multi-line support.

### PgSQL sample

More complex run with system properties for LDAP (see [plugin-id-ldap](https://github.com/ligoj/plugin-id-ldap)) and
a custom ORM dialect:

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

Note: There is a known Hibernate issue with schema generation `update` mode. The configured database user must see
only the target database. If there are several databases visible to this user, the update mechanism will try to populate the
tables of all visible databases, including the ones of the non-targeted databases. This strategy may produce an empty SQL
schema update when some tables already exist in a database different from the target one.


## Compatibilities

### Database

Tested compatibility and performance for 10,000+ users and 1,000+ projects.

| Vendor                                    | Version | Driver                   | Dialect                                                  | Status                  |
| ----------------------------------------- | ------- | ------------------------ | -------------------------------------------------------- | ----------------------- |
| [MySQL](https://www.mysql.com)            | 5.5     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MySQL](https://www.mysql.com)            | 5.6     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MySQL](https://www.mysql.com)            | 5.7     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MySQL](https://www.mysql.com)            | 8.0     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL8InnoDBUtf8Dialect     | OK                      |
| [MariaDB](https://mariadb.org/)           | 10.1    | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| [MariaDB](https://mariadb.org/)           | 10.1    | org.mariadb.jdbc.Driver  | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK, unknown performance |
| [PostgreSQL](https://www.postgresql.org/) | 9.6     | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |
| [PostgreSQL](https://www.postgresql.org/) | 10.21   | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |
| [PostgreSQL](https://www.postgresql.org/) | 15.1    | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |
| [PostgreSQL](https://www.postgresql.org/) | 17.0    | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | OK                      |

### JSE

The source compatibility is 21 without preview features.

| Vendor  | Release | OS              |
| ------- | ------- | --------------- |
| Oracle  | 21      | Linux and MacOS |
| OpenJDK | 21      | Linux and MacOS |

# Management endpoints

The following command is only available in development mode with the API exposed:

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

