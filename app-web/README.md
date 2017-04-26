# Build Docker image
```
docker build -t ligoj-app-web:1.5.0 --build-arg VERSION=1.5.0 .
```
# Run Docker image with security disabled
```
docker run -d --name ligoj-app-web --link ligoj-app-business:ligoj-app-business -p 8080:8080 ligoj-app-web:1.5.0 -Dligoj.endpoint.url=http://ligoj-app-business:8080/app-business/rest -Dligoj.plugins.endpoint.url=http://ligoj-app-business:8080/app-business/webjars -Dsecurity=Trusted
```