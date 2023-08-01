## :link: Ligoj - API [![Docker API](https://img.shields.io/docker/v/ligoj/ligoj-api)](https://hub.docker.com/r/ligoj/ligoj-api) - UI [![Docker UI](https://img.shields.io/docker/v/ligoj/ligoj-ui)](https://hub.docker.com/r/ligoj/ligoj-ui)


![alt text](https://github.com/ligoj/ligoj/raw/master/docs/assets/img/home-multi-project.png "Simple home page")
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_shield)

A web application to centralize the related tools of your projects, a 21th century links management with security and data collection.
More technical details can be found in the subdirectories [ligo-api](https://github.com/ligoj/ligoj/tree/master/app-api) and [ligo-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).


[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?metric=alert_status&project=org.ligoj.app:root)](https://sonarcloud.io/dashboard/index/org.ligoj.app:root)
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

Open your browser at : [Ligoj Home](http://localhost:8080/ligoj) 
User/password for administrator role : `ligoj-admin` and `ligoj-user` for a regular user

You can install the plug-ins for RBAC security : plugin-id,plugin-id-ldap,plugin-id-ldap-embedded

## Dev section

See [Wiki page](https://github.com/ligoj/ligoj/wiki/Dev-Setup)

See each container [ligo-api](https://github.com/ligoj/ligoj/tree/master/app-api) and [ligo-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_large)

## Installation guides

### One script rebuild and run

Docker, compose and git install, then build, then run.

``` bash
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

``` bash
AWS_ACCOUNT="$(aws sts get-caller-identity --query "Account" --output text)"
AWS_REGION="$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed 's/\(.*\)[a-z]/\1/')"
ECR_REGISTRY=$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
docker image tag ligoj/ligoj-api:3.3.0 $ECR_REGISTRY/ligoj/ligoj-api:3.3.0
docker image tag ligoj/ligoj-ui:3.3.0 $ECR_REGISTRY/ligoj/ligoj-ui:3.3.0
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
docker push $ECR_REGISTRY/ligoj/ligoj-api:3.3.0
docker push $ECR_REGISTRY/ligoj/ligoj-ui:3.3.0
```

# Advanced deployments with compose

## Persistent Ligoj home and podman

By default, with Docker compose, the home is persistent it contains:
- plugins installation
- logs of containers
- database data

Default mapped host directory is `/home/ligoj`, and can be overridden with `LIGOJ_HOME` variable.

``` bash
mkdir -p "$(pwd)/.ligoj"
echo "LIGOJ_HOME=$(pwd)/.ligoj
PODMAN_USERNS=keep-id" > .env
```

## Use MySQL or PostgreSQL databases

By default, the Docker compose overrides is loaded from `compose.override.yml` and contains MySQL configuration.

For PostgreSQL, the docker-compose command is:

``` bash
export BUILDAH_FORMAT=docker
podman-compose -p ligoj build
podman-compose -p ligoj -f compose.yml  -f compose-postgres.yml up -d
podman-compose -p ligoj -f compose.yml  -f compose-postgres.yml down
```
