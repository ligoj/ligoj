FROM openjdk:8-jre
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing && \
  apt-get install -y \
   curl

ARG APP="ligoj"
ARG GROUP_ID="org.${APP}.app"
ARG ARTIFACT_ID="app-web"
ARG NEXUS_HOST="oss.sonatype.org"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ENV CONTEXT "${APP}"
ENV CONTEXT_URL "/${CONTEXT}"
ARG VERSION
ARG WAR_URL="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"
#ARG WAR_URL="${NEXUS_URL}/service/local/repositories/orgligoj-1068/content/org/${APP}/app/${ARTIFACT_ID}/${VERSION}/${ARTIFACT_ID}-${VERSION}.war"
ENV LIGOJ_HOME /usr/local/ligoj
RUN mkdir -p "$LIGOJ_HOME"
WORKDIR $LIGOJ_HOME

ENV DOCKERIZE_VERSION v0.4.0

RUN set -xe \
  echo "Downloading application ${WAR_URL}" && \
        curl -sSL "${WAR_URL}" -o "ligoj-web.war" && \
  echo "Install Dockerize" && \
        curl -sSL https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz -o "dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz" && \
        tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz && \
        rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz && \
  echo "Cleaning" && \
        apt-get purge -y --auto-remove curl

ENV ENVIRONMENT="JAVA_MEMORY="-Xms128M -Xmx128M" CUSTOM_OPTS=""
ENV API="http://${APP}-api:8081/${APP}-api"
ENV JAVA_OPTIONS="-Dsecurity=Rest -Dsso.${APP}.url=${API}/rest/security/login -D${APP}.endpoint.manage.url=${API}/manage -D${APP}.endpoint.api.url=${API}/rest -D${APP}.endpoint.plugins.url=${API}/webjars -Dapp.crypto.password=public $JAVA_MEMORY -Dserver.context-path=${CONTEXT_URL} $CUSTOM_OPTS"
CMD dockerize -wait ${API} -timeout 300s java $JAVA_OPTIONS -jar $LIGOJ_HOME/ligoj-web.war