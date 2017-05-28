# Start database for development
```
docker run --name ligoj-db -d -p 3306:3306 -e MYSQL_RANDOM_ROOT_PASSWORD=yes -e MYSQL_DATABASE=ligoj -e MYSQL_USER=ligoj -e MYSQL_PASSWORD=ligoj -d mysql:5.7
```
# Build Docker image
```
docker build -t ligoj-app-business:1.5.0 --build-arg VERSION=1.5.0 .
```
# Run Docker image
```
docker run -d --name ligoj-business --link ligoj-db:db ligoj-app-business:1.5.0
```
