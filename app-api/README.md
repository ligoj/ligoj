# Packaging (with Maven)
Compile Java sources and produce the WAR file.
```
mvn clean package -DskipTests=true
```
Note: you can run this command either from the root module, either from the "app-api" module. When executed from the root module, bot WAR (app-api and app-ui) will be created. But if you want to produce production binaries, enable the "minify" profile "-Pminify".

# Test the WAR
```
java -Xmx1024M -Duser.timezone=UTC -Djpa.hbm2ddl=none -Dapp.safe.mode=true -Djdbc.host=ligoj-db -jar target/app-api-1.6.1.war
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

Reuse the local maven package
```
docker build -t ligoj-api:1.6.1 --build-arg VERSION=1.6.1 --build-arg WAR="target/app-api-1.6.1.war" .
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
  ligoj-api:1.6.1 
```

## Start the API container linked to an external database (Option2)
```
docker --rm -it \
 --name "ligoj-api" \
 -e CUSTOM_OPTS='-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password="ligoj" -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138' \
 ligoj-api:1.6.1
```

You can experience network issue with remote database. To validate the link, try this :
```
docker run --rm -it \
 --name "ligoj-api" \
 ligoj-api:1.6.1 bash -c "apt-get install -y mysql-client && mysql -h 192.168.4.138 --user=ligoj --password=ligoj ligoj"
```

More complex run with crypto and volume configurations
```
docker run --rm -it \
 --name "ligoj-api" \
 -e CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key" \
 -e CUSTOM_OPTS="-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password=ligoj -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138 -Dapp.safe.mode=true" \
 -v ~/.ligoj:/home/ligoj \
 -p 8680:8081 \
 ligoj-api:1.6.1
```
Note: On Windows host, replace "\" by "`" for multi-line support.

