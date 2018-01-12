## :link: Ligoj - API [![Docker API](https://img.shields.io/docker/build/ligoj/ligoj-api.svg)](https://hub.docker.com/r/ligoj/ligoj-api) - UI [![Docker UI](https://img.shields.io/docker/build/ligoj/ligoj-ui.svg)](https://hub.docker.com/r/ligoj/ligoj-ui)

![alt text](https://github.com/ligoj/ligoj/raw/master/docs/assets/img/home-multi-project.png "Simple home page")

A web application to centralize the related tools of your projects, a 21th century links management with security and data collection.
More technical details can be found in the sub directories [ligo-api](https://github.com/ligoj/ligoj/tree/master/app-api) and [ligo-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).


[![Build Status](https://travis-ci.org/ligoj/ligoj.svg?branch=master)](https://travis-ci.org/ligoj/ligoj)
[![Build Status](https://circleci.com/gh/ligoj/ligoj.svg?style=svg)](https://circleci.com/gh/ligoj/ligoj)
[![Build Status](https://codeship.com/projects/59d0b6a0-ef12-0134-dc5d-06835e321a69/status?branch=master)](https://codeship.com/projects/208765)
[![Build Status](https://semaphoreci.com/api/v1/ligoj/ligoj/branches/master/shields_badge.svg)](https://semaphoreci.com/ligoj/ligoj)
[![Build Status](https://ci.appveyor.com/api/projects/status/5926fmf0p5qp9j16/branch/master?svg=true)](https://ci.appveyor.com/project/ligoj/ligoj/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/ligoj/ligoj/badge.svg?branch=master)](https://coveralls.io/github/ligoj/ligoj?branch=master)
[![Dependency Status](https://www.versioneye.com/user/projects/58caeda8dcaf9e0041b5b978/badge.svg?style=flat)](https://www.versioneye.com/user/projects/58caeda8dcaf9e0041b5b978)
[![Quality Gate](https://sonarcloud.io/api/badges/gate?key=org.ligoj.api:root)](https://sonarcloud.io/dashboard/index/org.ligoj.api:root)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/abf810c094e44c0691f71174c707d6ed)](https://www.codacy.com/app/ligoj/ligoj?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ligoj/ligoj&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/f6bc3a113fddfad9151a/maintainability)](https://codeclimate.com/github/ligoj/ligoj/maintainability)
[![CodeFactor](https://www.codefactor.io/repository/github/ligoj/ligoj/badge)](https://www.codefactor.io/repository/github/ligoj/ligoj)
[![License](http://img.shields.io/:license-mit-blue.svg)](http://gus.mit-license.org/)

# User section
```
docker run -d --name ligoj-api --link ligoj-db:db ligoj-api:1.7.1
docker run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj-ui:1.7.1 
```
Open your browser at : http://localhost:8080/ligoj  
User/password for administrator role : ligoj-admin

You can install the plug-ins for RBAC security : plugin-id,plugin-id-ldap,plugin-id-ldap-embedded

## Make Ligoj home persistent
You can keep your plugins installation by mapping `/usr/local/ligoj` with a volume.

```
docker run -d --name ligoj-api --link ligoj-db:db -v ~/.ligoj:/usr/local/ligoj ligoj-api:1.7.1
```
# Dev section
## Pre-requisite for the bellow samples
Maven

Java 8: Open JDK or Oracle

A MySQL database 'ligoj' with all rights for user 'ligoj@localhost' and password 'ligoj' for ligoj-api container.

### With your own database
```sql
mysql --user=root
CREATE DATABASE `ligoj` DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_bin;
GRANT ALL PRIVILEGES ON `ligoj`.*  TO 'ligoj'@'localhost' IDENTIFIED BY 'ligoj';
FLUSH PRIVILEGES;
quit
```
### With a fresh new database 

```
docker run --name ligoj-db -d -p 3306:3306 -e MYSQL_RANDOM_ROOT_PASSWORD=yes -e MYSQL_DATABASE=ligoj -e MYSQL_USER=ligoj -e MYSQL_PASSWORD=ligoj -d mysql:5.7
```

## With Maven CLI
From your IDE with Maven, or from Maven CLI :

```
git clone https://github.com/ligoj/ligoj
mvn spring-boot:run -f app-api/pom.xml& 
mvn spring-boot:run -f app-ui/pom.xml&
```


### Packaging UI & API
When the WAR is built you can enable minified CSS/JS with the maven profile 'minify'. This requires 'clean-css-cli' NPM module.

```
npm install clean-css-cli -g
mvn clean package -Pminifiy -DskipTests=true
```

### Deploying
Nexus OSS

```
mvn clean deploy -Dgpg.skip=false -Psources,javadoc,minify -DskipTests=true
```

Bintray

```
mvn deploy -Dgpg.skip=false -Psources,javadoc,bintray,minify -DskipTests=true
```

## With your IDE
From your IDE, without Maven runner (but Maven classpath contribution), create and execute 2 run configurations with the following main classes :

```
org.ligoj.boot.api.Application
```
```
org.ligoj.boot.web.Application
```
Notes these launchers (*.launch) are already configured for Eclipse.
Important : Using Eclipse compiler, enable 'Store information about method parameters (usable with reflection)' in general preferences/Java/Compiler

## Compatibilities
### Database
See each container [![ligo-api]](https://github.com/ligoj/ligoj/tree/master/app-api)
Compatibility and performance for 10K+users and 1K+ projects

### JSE

| Vendor     | Version  | Status |
|------------|----------|--------|
| Oracle     | 1.8u121+ | OK     |
| OpenJQK    | 1.8u121+ | OK     |

# Ops section
## With Docker
Build the images and run the containers with docker compose

```
docker-compose up
```

Docker run separately:

```
docker run -d --name ligoj-api --link ligoj-db:db ligoj-api:1.7.1
docker run -d --name ligoj-ui --link ligoj-api:api -p 8080:8080 ligoj-ui:1.7.1 
```

Docker build (ARG) variables:

```
NEXUS_URL : Repository base host used to download the WAR files
VERSION   : Ligoj version, used to build the WAR_URL
WAR_URL   : Full WAR URL, built from NEXUS_URL and VERSION
```

Docker environment variables:

See each container [![ligo-api]](https://github.com/ligoj/ligoj/tree/master/app-api) and [![ligo-ui]](https://github.com/ligoj/ligoj/tree/master/app-ui).
