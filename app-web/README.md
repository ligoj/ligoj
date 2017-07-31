# Build Docker image
```
docker build -t ligoj-web:1.6.0 --build-arg VERSION=1.6.0 .
```
# Run Docker image with security disabled
```
docker run -d --name ligoj-web --link ligoj-api:api -p 8080:8080 ligoj-web:1.6.0 
```