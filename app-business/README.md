# Start database for development
```
docker run --name ligoj-db -d -p 3306:3306 -e MYSQL_RANDOM_ROOT_PASSWORD=yes -e MYSQL_DATABASE=ligoj -e MYSQL_USER=ligoj -e MYSQL_PASSWORD=ligoj -d mysql:5.7.18
```
# Build Docker image
```
docker build -t ligoj-app-business:1.5.0 --build-arg VERSION=1.5.0 .
```
# Run Docker image
```
docker run -d --name ligoj-app-business --link ligoj-db:ligoj-db -e jdbc.url="jdbc:mysql://ligoj-db:3306/ligoj?useColumnNamesInFindColumn=true&useUnicode=yes&characterEncoding=UTF-8&autoReconnect=true&maxReconnects=10&useLegacyDatetimeCode=false&serverTimezone=UTC" -e jdbc.username=ligoj -e jdbc.password=ligoj ligoj-app-business:1.5.0
```
