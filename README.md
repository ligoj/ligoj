## :link: Ligoj [![Maven Central](https://maven-badges.herokuapp.com/maven-central/org.ligoj.app/root/badge.svg)](https://maven-badges.herokuapp.com/maven-central/org.ligoj.app/root) [![Download](https://api.bintray.com/packages/ligoj/maven-repo/ligoj/images/download.svg) ](https://bintray.com/ligoj/maven-repo/ligoj/_latestVersion)
A web application to centralize the related tools of your projects, a 21th century links management with security and data collection.

[![Build Status](https://travis-ci.org/ligoj/ligoj.svg?branch=master)](https://travis-ci.org/ligoj/ligoj)
[![Build Status](https://circleci.com/gh/ligoj/ligoj.svg?style=svg)](https://circleci.com/gh/ligoj/ligoj)
[![Build Status](https://codeship.com/projects/59d0b6a0-ef12-0134-dc5d-06835e321a69/status?branch=master)](https://codeship.com/projects/208765)
[![Build Status](https://semaphoreci.com/api/v1/ligoj/ligoj/branches/master/shields_badge.svg)](https://semaphoreci.com/ligoj/ligoj)
[![Build Status](https://ci.appveyor.com/api/projects/status/5926fmf0p5qp9j16/branch/master?svg=true)](https://ci.appveyor.com/project/ligoj/ligoj/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/ligoj/ligoj/badge.svg?branch=master)](https://coveralls.io/github/ligoj/ligoj?branch=master)
[![Dependency Status](https://www.versioneye.com/user/projects/58caeda8dcaf9e0041b5b978/badge.svg?style=flat-square)](https://www.versioneye.com/user/projects/58caeda8dcaf9e0041b5b978)
[![Quality Gate](https://sonarqube.com/api/badges/gate?key=org.ligoj.api:root)](https://sonarqube.com/dashboard/index/org.ligoj.api:root)
[![Sourcegraph Badge](https://sourcegraph.com/github.com/ligoj/ligoj/-/badge.svg)](https://sourcegraph.com/github.com/ligoj/ligoj?badge)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/abf810c094e44c0691f71174c707d6ed)](https://www.codacy.com/app/ligoj/ligoj?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ligoj/ligoj&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://img.shields.io/codeclimate/github/ligoj/ligoj.svg)](https://codeclimate.com/github/ligoj/ligoj)
[![CodeFactor](https://www.codefactor.io/repository/github/ligoj/ligoj/badge)](https://www.codefactor.io/repository/github/ligoj/ligoj)
[![codebeat badge](https://codebeat.co/badges/c8c372da-c0f2-4ba1-8fb4-5d5713aeb53f)](https://codebeat.co/projects/github-com-ligoj-ligoj-api-master)
[![License](http://img.shields.io/:license-mit-blue.svg)](http://gus.mit-license.org/)

# Dev section
From your IDE, without Maven runner (but Maven classpath contribution), create and execute 2 run configurations with the following main classes :
```
org.ligoj.boot.api.Application
```
```
org.ligoj.boot.web.Application
```
Notes these launchers (*.launch) are already configured for Eclipse.

From your IDE with Maven, or from Maven CLI simply use goal "spring-boot:run"
