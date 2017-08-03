# Start database for development
```
docker run --name ligoj-db -d -p 3306:3306 -e MYSQL_RANDOM_ROOT_PASSWORD=yes -e MYSQL_DATABASE=ligoj -e MYSQL_USER=ligoj -e MYSQL_PASSWORD=ligoj -d mysql:5.6
```
# Build Docker image
```
docker build -t ligoj-api:1.6.1 --build-arg VERSION=1.6.1 .
```

## Custom builds
### Custom URL
During the build, the WAR file "ligoj-api.war" is not copied from your local FS but from a previously released remote location such as Nexus.
By default, the location is "https://oss.sonatype.org/service/local/artifact/maven/redirect?r=public&g=org.ligoj.app&a=app-api&v=1.0.0&p=war"
In case of a custom build you can specify its remote or local location.

Staged OSS build from Sonatype
```
docker build -t ligoj-api:1.6.1 --build-arg VERSION=1.6.1 --build-arg WAR="https://oss.sonatype.org/service/local/repositories/orgligoj-1087/content/org/ligoj/app/app-api/1.6.1/app-api-1.6.1.war" .
```

Private remote build
```
docker build -t ligoj-api:1.6.1 --build-arg VERSION=1.6.1 --build-arg WAR="https://storage.company.com/releases/app-api-1.6.1.war" .
```

Local build 
```
docker build -t ligoj-api:1.6.1 --build-arg VERSION=1.6.1 --build-arg WAR="target/app-api-1.6.1.war" .
```

# Run Docker image
```
docker run -d --name ligoj-api --link ligoj-db:db ligoj-api:1.6.1
```

More complexe run with database outside container
```
docker run -d \
 --name "ligoj-api" \
 --env CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key" \
 --env CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password="ligoj" -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138 -Dapp.safe.mode=true' \
 --volume /Users/fdaugan/.ligoj:/home/ligoj \
 -p 8680:8081 \
 --health-cmd="curl --silent --fail localhost:8081/ligoj-api/manage/health || exit 1" \
 --health-interval=5s \
 --health-retries=12 \
 --health-timeout=2s \
 ligoj-api:1.6.1
```
Note : On Windows host, replace "\" by "`" for multi-line support.


docker run --rm -it \
 --name "ligoj-api" \
 --env CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key" \
 --env CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password="ligoj" -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138 -Dapp.safe.mode=true' \
 --volume /Users/fdaugan/.ligoj:/home/ligoj \
 -p 8680:8081 \
 --health-cmd="curl --silent --fail localhost:8081/ligoj-api/manage/health || exit 1" \
 --health-interval=5s \
 --health-retries=12 \
 --health-timeout=2s \
 ligoj-api:1.6.1 ls /tmp

