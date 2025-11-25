## :link: Ligoj - API [![Docker API](https://img.shields.io/docker/v/ligoj/ligoj-api)](https://hub.docker.com/r/ligoj/ligoj-api) - UI [![Docker UI](https://img.shields.io/docker/v/ligoj/ligoj-ui)](https://hub.docker.com/r/ligoj/ligoj-ui)

![alt text](https://github.com/ligoj/ligoj/raw/master/docs/assets/img/home-multi-project.png "Home page")
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_shield)

A web application to centralize the related tools of your projects, a dynamic connection management with security and
data collection.

More technical details can be found in the subdirectories [ligoj-api](https://github.com/ligoj/ligoj/tree/master/app-api)
and [ligoj-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ligoj_ligoj&metric=coverage)](https://sonarcloud.io/summary/new_code?id=ligoj_ligoj)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/abf810c094e44c0691f71174c707d6ed)](https://www.codacy.com/gh/ligoj/ligoj?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ligoj/ligoj&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/f6bc3a113fddfad9151a/maintainability)](https://codeclimate.com/github/ligoj/ligoj/maintainability)
[![CodeFactor](https://www.codefactor.io/repository/github/ligoj/ligoj/badge)](https://www.codefactor.io/repository/github/ligoj/ligoj)
[![License](http://img.shields.io/:license-mit-blue.svg)](http://fabdouglas.mit-license.org/)
[![Sauce Test Status](https://saucelabs.com/buildstatus/fabdouglas)](https://saucelabs.com/u/fabdouglas)

### Big Thanks

Cross-browser Testing Platform and Open Source <3 Provided by [Sauce Labs][homepage]

[homepage]: https://saucelabs.com

# Get started

```
curl https://raw.githubusercontent.com/ligoj/ligoj/master/docker-compose.yml -o docker-compose.yml -s && docker-compose up
```

Open your browser at: [Ligoj Home](http://localhost:8080/ligoj)
User/password for the administrator role: `ligoj-admin` and `ligoj-user` for a regular user

You can install the plug-ins for RBAC security: plugin-id,plugin-id-ldap,plugin-id-ldap-embedded

## Dev section

See [Wiki page](https://github.com/ligoj/ligoj/wiki/Dev-Setup)

See each container [ligoj-api](https://github.com/ligoj/ligoj/tree/master/app-api)
and [ligoj-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_large)

## Installation guides

### One script rebuild and run

Docker, compose and git install, then build, then run.

```bash
sudo yum install -y docker git
sudo pip3 install docker-compose
sudo usermod -a -G docker ec2-user
sudo systemctl enable docker.service
sudo systemctl start docker.service
git clone https://github.com/ligoj/ligoj.git
cd ligoj
mkdir -p "$(pwd)/.ligoj"
echo "LIGOJ_HOME=$(pwd)/.ligoj
PODMAN_USERNS=keep-id" > .env
docker-compose -p ligoj up -d --build
open http://localhost:8080/ligoj
```

## Publish to AWS ECR

```bash
AWS_ACCOUNT="$(aws sts get-caller-identity --query "Account" --output text)"
AWS_REGION="$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed 's/\(.*\)[a-z]/\1/')"
ECR_REGISTRY=$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
docker image tag ligoj/ligoj-api:4.0.0 $ECR_REGISTRY/ligoj/ligoj-api:4.0.0
docker image tag ligoj/ligoj-ui:4.0.0 $ECR_REGISTRY/ligoj/ligoj-ui:4.0.0
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
docker push $ECR_REGISTRY/ligoj/ligoj-api:4.0.0
docker push $ECR_REGISTRY/ligoj/ligoj-ui:4.0.0
```

# Advanced deployments with Docker Compose

## Custom Docker Compose variables

| Variable               | Service | Phase | Default                               | Note                                                                                                                                                                                                                                 |
|------------------------|---------|-------|---------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| LIGOJ_HOME             | api     | RUN   | `/home/ligoj`                         | To map a persistent home                                                                                                                                                                                                             |
| LIGOJ_REGISTRY         | *       | BUILD |                                       | To push to your registry. When provided, must ends with `/`.                                                                                                                                                                         |
| LIGOJ_VERSION          | app-*   | BUILD | (version of application)              |                                                                                                                                                                                                                                      |
| LIGOJ_WEB_PORT         | web     | RUN   | `8080`                                | Internal WEB port                                                                                                                                                                                                                    |
| LIGOJ_PORT             | web     | RUN   | `8080`                                | Exposed port                                                                                                                                                                                                                         |
| LIGOJ_API_JAVA_OPTIONS | api     | RUN   | `-Duser.timezone=UTC`                 |                                                                                                                                                                                                                                      |
| LIGOJ_WEB_JAVA_OPTIONS | web     | RUN   | `-Duser.timezone=UTC -Dsecurity=Rest` |                                                                                                                                                                                                                                      |
| LIGOJ_API_CRYPTO       | api     | RUN   | `-Dapp.crypto.password=public`        | Double encryption feature, see [core-context-common.xml](https://github.com/ligoj/bootstrap/blob/5e23ac71c48bb89c8c44433bb4a89a30cbb4700c/bootstrap-core/src/main/resources/META-INF/spring/core-context-common.xml#L16C101-L16C101) |
| LIGOJ_WEB_CRYPTO       | web     | RUN   | `-Dapp.crypto.password=public`        | Double encryption feature, see [core-context-common.xml](https://github.com/ligoj/bootstrap/blob/5e23ac71c48bb89c8c44433bb4a89a30cbb4700c/bootstrap-core/src/main/resources/META-INF/spring/core-context-common.xml#L16C101-L16C101) |
| LIGOJ_API_CUSTOM_OPTS  | api     | RUN   | ``                                    | Additional Java properties  `LIGOJ_API_JAVA_OPTIONS`                                                                                                                                                                                 |
| LIGOJ_WEB_CUSTOM_OPTS  | web     | RUN   | ``                                    | Additional Java properties, merged with `LIGOJ_WEB_JAVA_OPTIONS`                                                                                                                                                                     |
| LIGOJ_BUILD_PLATFORM   | app-*   | BUILD | `linux/amd64`                         | Docker build platform.                                                                                                                                                                                                               |
| LIGOJ_TARGET_PLATFORM  | app-*   | BUILD | `linux/amd64`                         | Docker run platform.                                                                                                                                                                                                                 |

Sample `.env` file:

```ini
LIGOJ_HOME=/var/data/ligoj
PODMAN_USERNS=keep-id
LIGOJ_BUILD_PLATFORM=linux/arm64
LIGOJ_TARGET_PLATFORM=linux/arm64
LIGOJ_REGISTRY=nexus.sample.local/
LIGOJ_API_PREPARE_BUILD='export HTTP_PROXY=192.168.0.254:8000 && export HTTPS_PROXY=192.168.0.254:8000'
```

## Custom Docker Compose discovered scripts

| Source             | Service | Destination  | Phase | Note                                                                                               |
|--------------------|---------|--------------|-------|----------------------------------------------------------------------------------------------------|
| `prepare-build.sh` | app-*   | `WORKDIR`    | BUILD | Additional Bash commands executed inside the builder , before `mvn` but after `MAVEN_OPTS` is set. |
| `prepare-run.sh`   | app-*   | `WORKDIR`    | RUN   | Additional Bash commands executed inside the final image, before `java`                            |
| `.m2/`             | app-*   | `/root/.m2/` | BUILD | Custom Maven configuration: proxy, mirror, dependencies,...                                        |

Sample `prepare-build.sh` file:

```ini
export http_proxy=192.168.0.254:8000
export https_proxy=192.168.0.254:8000
```

## Persistent Ligoj home

By default, with Docker compose, the home is persistent it contains:

- plugins installation
- logs of containers
- database data

```bash
mkdir -p "$(pwd)/.ligoj"
echo "LIGOJ_HOME=$(pwd)/.ligoj
PODMAN_USERNS=keep-id" > .env
```

## Use MySQL or PostgreSQL databases

By default, the Docker compose overrides is loaded from `compose.override.yml` and contains MySQL configuration.

For MySQL, the docker-compose command is:

```bash
export BUILDAH_FORMAT=docker
podman-compose -p ligoj build
podman-compose -p ligoj -f compose.yml  -f compose-mysql.yml up -d
podman-compose -p ligoj -f compose.yml  -f compose-mysql.yml down
```

For PostgreSQL, the docker-compose command is:

```bash
export BUILDAH_FORMAT=docker
podman-compose -p ligoj build
podman-compose -p ligoj -f compose.yml  -f compose-override.yml up -d
podman-compose -p ligoj -f compose.yml  -f compose-override.yml down
```

# API Description

API is only available from a valid session.

- [Swagger UI](http://localhost:8080/ligoj/#/api) page
- [WADL](http://localhost:8080/ligoj/rest/?_wadl)

# Plugin management

Ligoj is massively based on plugin management.

All plugins are deployed in [Maven central](https://mvnrepository.com/artifact/org.ligoj.plugin)

To build and deploy a plugin, more information is available in the [plugin-api](https://github.com/ligoj/plugin-api) repository.

# Custom UI

Ligoj comes with a modular approach. For custom UI, the solutions are:
- Rebuild [plugin-ui](https://github.com/ligoj/plugin-ui), with specific assets, and deploy this plugin in a custom Maven repository, or upload it with `/system/plugin/{artifact}/{version}` API
- Create your own plugin `plugin-ui-company`, with your specific assets: overrides and additions. Then install this plugin as the above solution
- Copy you specific assets in the Ligoj home directory such as `/home/ligoj/META-INF/resources/webjars`, `$(pwd)/.ligoj/META-INF/resources/webjars`, depending on your runtime. For a sample:
    ```bash
    # With Ligoj CLI
    ligoj configuration set --id "ligoj.file.path" --value "^/home/ligoj/META-INF/resources/webjars/.*,^/home/ligoj/statics/themes/.*"
    ligoj file put --from /path/to/icon.png  --path "/home/ligoj/META-INF/resources/webjars/home/img/logo.png"
    ligoj file put --from /path/to/bg1.jpg  --path "/home/ligoj/statics/themes/bootstrap-material-design/img/bg1.jpg"
  
    # With local access of Ligoj home folder
    mkdir -p "${LIGOJ_HOME}/META-INF/resources/webjars/home/img" && cp /path/to/icon.png "$_/logo.png"
    mkdir -p "${LIGOJ_HOME}/statics/themes/bootstrap-material-design/img" && cp /path/to/bg1.jpg "$_/bg1.jpg"
    ```
  
# Software Bill of Materials (SBOM)

SBOM content is exposed thanks to Spring Actuator at this endpoint `http://localhost:8080/ligoj/manage/sbom`