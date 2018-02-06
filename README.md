## :link: Ligoj - API [![Docker API](https://img.shields.io/docker/build/ligoj/ligoj-api.svg)](https://hub.docker.com/r/ligoj/ligoj-api) - UI [![Docker UI](https://img.shields.io/docker/build/ligoj/ligoj-ui.svg)](https://hub.docker.com/r/ligoj/ligoj-ui)

![alt text](https://github.com/ligoj/ligoj/raw/master/docs/assets/img/home-multi-project.png "Simple home page")

A web application to centralize the related tools of your projects, a 21th century links management with security and data collection.
More technical details can be found in the sub directories [ligo-api](https://github.com/ligoj/ligoj/tree/master/app-api) and [ligo-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).


[![Build Status](https://travis-ci.org/ligoj/ligoj.svg?branch=master)](https://travis-ci.org/ligoj/ligoj)
[![Build Status](https://circleci.com/gh/ligoj/ligoj.svg?style=svg)](https://circleci.com/gh/ligoj/ligoj)
[![Build Status](https://codeship.com/projects/59d0b6a0-ef12-0134-dc5d-06835e321a69/status?branch=master)](https://codeship.com/projects/208765)
[![Build Status](https://semaphoreci.com/api/v1/ligoj/ligoj/branches/master/shields_badge.svg)](https://semaphoreci.com/ligoj/ligoj)
[![Dependency Status](https://www.versioneye.com/user/projects/58caeda8dcaf9e0041b5b978/badge.svg?style=flat)](https://www.versioneye.com/user/projects/58caeda8dcaf9e0041b5b978)
[![Quality Gate](https://sonarcloud.io/api/badges/gate?key=org.ligoj.api:root)](https://sonarcloud.io/dashboard/index/org.ligoj.api:root)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/abf810c094e44c0691f71174c707d6ed)](https://www.codacy.com/app/ligoj/ligoj?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ligoj/ligoj&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/f6bc3a113fddfad9151a/maintainability)](https://codeclimate.com/github/ligoj/ligoj/maintainability)
[![CodeFactor](https://www.codefactor.io/repository/github/ligoj/ligoj/badge)](https://www.codefactor.io/repository/github/ligoj/ligoj)
[![License](http://img.shields.io/:license-mit-blue.svg)](http://gus.mit-license.org/)

# Get started

```
docker-compose up
```

Open your browser at : [Ligoj Home](http://localhost:8080/ligoj) 
User/password for administrator role : `ligoj-admin` and `ligoj-user` for a regular user

You can install the plug-ins for RBAC security : plugin-id,plugin-id-ldap,plugin-id-ldap-embedded

# Deeper

## Make Ligoj home persistent

You can keep your plugins installation by mapping `/usr/local/ligoj` with a volume. The `ligoj-ui` container has no persistent data.

```
docker run -d --name ligoj-api --link ligoj-db:db -v ~/.ligoj:/usr/local/ligoj ligoj/ligoj-api:1.7.2
```

## Dev section

See [Wiki page](https://github.com/ligoj/ligoj/wiki/Dev-Setup)

See each container [ligo-api](https://github.com/ligoj/ligoj/tree/master/app-api) and [ligo-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).
