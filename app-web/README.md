# Build Docker image
```
docker build -t ligoj-web:1.5.1 --build-arg VERSION=1.5.1 .
```
# Run Docker image with security disabled
```
docker run -d --name ligoj-web --link ligoj-api:api -p 8080:8080 ligoj-web:1.5.1 
```