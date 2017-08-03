# Packaging
When the WAR is built you can enable minified CSS/JS with the maven profile 'minify'. This requires 'cleancss' npm module.
```
npm install clean-css-cli -g
mvn clean package -Pminifiy -DskipTests=true
```

# Build Docker image
```
docker build -t ligoj-ui:1.6.1 --build-arg VERSION=1.6.1 .
```
# Run Docker image with security disabled
```
docker run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj-ui:1.6.1 
```