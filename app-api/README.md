## API (REST) container running a stateless SpringBoot application.
Roles :
- URL security level, with RBAC : User / Role / Permission for a URL pattern supporting dynamic configuration
- Resource security level (most complex) giving to users, groups and companies an access (read, write, +grant) to nodes, users, groups, companies
- Plug-in runtime and life-cycle management

# Packaging (with Maven)
Compile Java sources and produce the WAR file.

```
mvn clean package -DskipTests=true
```
Note: you can run this command either from the root module, either from the "app-api" module. When executed from the root module, both WAR (app-api and app-ui) will be created. But if you want to produce production binaries, enable the "minify" profile "-Pminify".

# Test the WAR
```
java -Xmx1024M -Duser.timezone=UTC -Djpa.hbm2ddl=none -Dapp.safe.mode=true -Djdbc.host=ligoj-db -jar target/app-api-1.6.10.war
```

# Build Docker image
```
docker build -t ligoj-api:1.6.10 --build-arg VERSION=1.6.10 .
```

## Custom builds
### Custom URL
During the build, the WAR file "ligoj-api.war" is not copied from your local FS but from a previously released remote location such as Nexus.
By default, the location is "https://oss.sonatype.org/service/local/artifact/maven/redirect?r=public&g=org.ligoj.app&a=app-api&v=1.0.0&p=war"
In case of a custom build you can specify its remote or local location.

Staged OSS build from Sonatype

```
docker build -t ligoj-api:1.6.10 --build-arg VERSION=1.6.10 --build-arg WAR="https://oss.sonatype.org/service/local/repositories/orgligoj-1087/content/org/ligoj/app/app-api/1.6.10/app-api-1.6.10.war" .
```

Private remote build

```
docker build -t ligoj-api:1.6.10 --build-arg VERSION=1.6.10 --build-arg WAR="https://storage.company.com/releases/app-api-1.6.10.war" .
```

Reuse the local maven package

```
docker build -t ligoj-api:1.6.10 --build-arg VERSION=1.6.10 --build-arg WAR="target/app-api-1.6.10.war" .
```
Note the local WAR path must be relative to the Dockerfile (not the current path), and must be bellow the Dockerfile: do not use "../bar/foo.war"

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
docker --rm -it \
  --name ligoj-api \
  -e CUSTOM_OPTS='-Djpa.hbm2ddl=update -Djdbc.host=ligoj-db' \
  ligoj-api:1.6.10 
```

## Start the API container linked to an external database (Option2)
```
docker run --rm -it \
 --name "ligoj-api" \
 -e CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password="ligoj" -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138' \
 ligoj-api:1.6.10
```

You can experience network issue with remote database. To validate the link, try this :

```
docker run --rm -it \
 --name "ligoj-api" \
 ligoj-api:1.6.10 bash -c "apt-get install -y mysql-client && mysql -h 192.168.4.138 --user=ligoj --password=ligoj ligoj"
```

More complex run with crypto, port mapping and volume configurations

```
docker run --rm -it \
 --name "ligoj-api" \
 -e CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key" \
 -e CUSTOM_OPTS="-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password=ligoj -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138 -Dapp.safe.mode=true" \
 -v ~/.ligoj:/home/ligoj \
 -p 8680:8081 \
 ligoj-api:1.6.10
```
Note: On Windows host, replace all \ (escape) by ` for multi-line support.

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
```

Spring-Boot properties (injected in CUSTOM_OPTS):

```
server.port               = ${SERVER_PORT}
server.address            = ${SERVER_HOST}
server.context-path       = /${CONTEXT}
management.context-path   = /manage
management.security.roles = USER
jpa.hbm2ddl               = <[update],none,validate>. With "update", the server takes up to 30s to start
jdbc.vendor               = <[mysql],postgresql,mariadb>
jdbc.port                 = 3306
jdbc.database             = ligoj
jdbc.username             = ligoj
jdbc.password             = ligoj
jdbc.host                 = localhost
jpa.dialect               = <[org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect],org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect>
jdbc.driverClassName      = <[com.mysql.cj.jdbc.Driver],org.postgresql.Driver>
jdbc.urlparam             = ?useColumnNamesInFindColumn=true&useUnicode=yes&characterEncoding=UTF-8&autoReconnect=true&maxReconnects=10&useLegacyDatetimeCode=false&serverTimezone=UTC
jdbc.url                  = jdbc:${jdbc.vendor}://${jdbc.host}:${jdbc.port}/${jdbc.database}${jdbc.urlparam:}
jdbc.validationQuery      = select 1;
jdbc.maxIdleTime          = 180000
jdbc.maxPoolSize          = 150
health.node               = 0 0 0/1 1/1 * ?
health.subscription       = 0 0 2 1/1 * ?
app.crypto.file           = Secret file location
app.safe.mode             = <[false],true> When true, plug-ins are not loaded and their state is not updated
```

## Compatibilities
### Database
Compatibility and performance for 10K+users and 1K+ projects

| Vendor     | Version | Driver                   | Dialect                                                  | Status                  |
|------------|---------|--------------------------|----------------------------------------------------------|-------------------------|
| MySQL      | 5.5     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | A bit slow in plugin-id |
| MySQL      | 5.6     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | OK                      |
| MySQL      | 5.7     | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | Slow in plugin-id       |
| MariaDB    | 10.1    | com.mysql.cj.jdbc.Driver | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | Slow in plugin-id       |
| MariaDB    | 10.1    | org.mariadb.jdbc.Driver  | org.ligoj.bootstrap.core.dao.MySQL5InnoDBUtf8Dialect     | ?                       |
| PostGreSQL | 9.6     | org.postgresql.Driver    | org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect | A bit slow in plugin-id |

### JSE

| Vendor     | Version  | Status |
|------------|----------|--------|
| Oracle     | 1.8u121+ | OK     |
| OpenJQK    | 1.8u121+ | OK     |

