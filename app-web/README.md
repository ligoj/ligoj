# Build Docker image
```
docker build -t ligoj-app-web:1.5.0 --build-arg VERSION=1.5.0 .
```
# Run Docker image with security disabled
```
docker run -d --name ligoj-web --link ligoj-business:ligoj-business -e CUSTOM_OPTS="-Dsecurity=Trusted" -p 8080:8080 ligoj-app-web:1.5.0 
```