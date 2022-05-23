## :link: Ligoj - API [![Docker API](https://img.shields.io/docker/build/ligoj/ligoj-api.svg)](https://hub.docker.com/r/ligoj/ligoj-api) - UI [![Docker UI](https://img.shields.io/docker/build/ligoj/ligoj-ui.svg)](https://hub.docker.com/r/ligoj/ligoj-ui)

![alt text](https://github.com/ligoj/ligoj/raw/master/docs/assets/img/home-multi-project.png "Simple home page")
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_shield)

A web application to centralize the related tools of your projects, a 21th century links management with security and data collection.
More technical details can be found in the sub directories [ligo-api](https://github.com/ligoj/ligoj/tree/master/app-api) and [ligo-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).


[![Build Status](https://app.travis-ci.com/github/ligoj/ligoj.svg?branch=master)](https://app.travis-ci.com/github/ligoj/ligoj)
[![Build Status](https://circleci.com/gh/ligoj/ligoj.svg?style=svg)](https://circleci.com/gh/ligoj/ligoj)
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

# Deeper

## Make Ligoj home persistent

You can keep your plugins installation by mapping `/usr/local/ligoj` with a volume. The `ligoj-ui` container has no persistent data.

```
docker run -d --name ligoj-api --link ligoj-db:db -v ~/.ligoj:/usr/local/ligoj ligoj/ligoj-api:3.2.2
```

## Dev section

See [Wiki page](https://github.com/ligoj/ligoj/wiki/Dev-Setup)

See each container [ligo-api](https://github.com/ligoj/ligoj/tree/master/app-api) and [ligo-ui](https://github.com/ligoj/ligoj/tree/master/app-ui).


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fligoj%2Fligoj.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fligoj%2Fligoj?ref=badge_large)
