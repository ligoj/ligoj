# Packaging (with Maven)
Compile Java sources, optionaly minify sources (css/js) and package into the WAR file.
```
mvn clean package -DskipTests=true
```
Note: you can run this command either from the root module, either from the "app-ui" module. When executed from the root module, both WAR (app-api and app-ui) will be created. But if you want to produce production binaries, enable the "minify" profile "-Pminify".
The maven profile 'minify' requires 'cleancss' npm module.
```
npm install clean-css-cli -g
mvn clean package -DskipTests=true -Pminifiy
```

# Test the WAR
Test the integration with a running API end-point :
```
java -Dligoj.endpoint="http://192.168.4.138:8081/ligoj-api" -jar target/app-ui-1.6.2.1.war
```

# Build Docker image
```
docker build -t ligoj-ui:1.6.2.1 --build-arg VERSION=1.6.2.1 .
```

## Custom builds
### Custom URL
During the build, the WAR file "ligoj-ui.war" is not copied from your local FS but from a previously released remote location such as Nexus.
By default, the location is "https://oss.sonatype.org/service/local/artifact/maven/redirect?r=public&g=org.ligoj.app&a=app-ui&v=1.0.0&p=war"
In case of a custom build you can specify its remote or local location.

Staged OSS build from Sonatype
```
docker build -t ligoj-ui:1.6.2.1 --build-arg VERSION=1.6.2.1 --build-arg WAR="https://oss.sonatype.org/service/local/repositories/orgligoj-1087/content/org/ligoj/app/app-ui/1.6.2.1/app-ui-1.6.2.1.war" .
```

Private remote build
```
docker build -t ligoj-ui:1.6.2.1 --build-arg VERSION=1.6.2.1 --build-arg WAR="https://storage.company.com/releases/app-ui-1.6.2.1.war" .
```

Reuse the local maven package
```
docker build -t ligoj-ui:1.6.2.1 --build-arg VERSION=1.6.2.1 --build-arg WAR="target/app-ui-1.6.2.1.war" .
```
Note the local WAR path must be relative to the Dockerfile (not the current path), and must be bellow the Dockerfile: do not use "../bar/foo.war"

# Run Docker image

```
docker run --rm -it \
  --name ligoj-ui \
  -e ENDPOINT='http://192.168.4.138:8680/ligoj-api' \
  -p 8080:8080 \
  ligoj-ui:1.6.2.1 
```

You can experience network issue with remote API. To validate the link, try this :
```
docker run --rm -it \
 --name "ligoj-ui" \
 ligoj-ui:1.6.2.1 bash -c "apt-get install -y curl && curl --failed http://192.168.4.138:8081/ligoj-api/manage/health"
```

More complex run with crypto and volume configurations
```
docker run --rm -it \
 --name "ligoj-api" \
 -e CRYPTO="-Dapp.crypto.file=/home/ligoj/security.key" \
 -e CUSTOM_OPTS="-Djdbc.database=ligoj -Djdbc.username=ligoj -Djdbc.password=ligoj -Djpa.hbm2ddl=none -Djdbc.host=192.168.4.138 -Dapp.safe.mode=true" \
 -v ~/.ligoj:/home/ligoj \
 -p 8680:8081 \
 ligoj-api:1.6.2.1
```
Note: On Windows host, replace "\" by "`" for multi-line support.


# Packaging
When the WAR is built you can enable minified CSS/JS with the maven profile 'minify'. This requires 'cleancss' npm module.
```
npm install clean-css-cli -g
mvn clean package -Pminifiy -DskipTests=true
```

# Build Docker image
```
docker build -t ligoj-ui:1.6.2.1 --build-arg VERSION=1.6.2.1 .
```
# Run Docker image with security disabled
```
docker run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj-ui:1.6.2.1 
```