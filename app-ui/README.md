# Build Docker image
```
docker build -t ligoj-ui:1.6.1 --build-arg VERSION=1.6.1 .
```
# Run Docker image with security disabled
```
docker run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj-ui:1.6.1 
```