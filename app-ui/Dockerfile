FROM openjdk:8-jre
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing && \
  apt-get install -y \
   curl

ARG APP="ligoj"
ARG GROUP_ID="org.${APP}.app"
ARG ARTIFACT_ID="app-ui"
ARG NEXUS_HOST="oss.sonatype.org"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ENV CONTEXT "${APP}"
ENV CONTEXT_URL "/${CONTEXT}"
ARG VERSION
ARG WAR_URL="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"
#ARG WAR_URL="${NEXUS_URL}/service/local/repositories/orgligoj-1085/content/org/${APP}/app/${ARTIFACT_ID}/${VERSION}/${ARTIFACT_ID}-${VERSION}.war"
ENV SERVER_HOME /usr/local/ligoj
RUN mkdir -p "$SERVER_HOME"
WORKDIR $SERVER_HOME

ENV DOCKERIZE_VERSION v0.4.0

RUN set -xe \
  echo "Downloading application ${WAR_URL}" && \
        curl -sSL "${WAR_URL}" -o "ligoj-ui.war" && \
  echo "Install Dockerize" && \
        curl -sSL https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz -o "dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz" && \
        tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz && \
        rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz && \
  echo "Cleaning" && \
        apt-get purge -y --auto-remove curl

ENV JAVA_MEMORY="-Xms128M -Xmx128M"
ENV CUSTOM_OPTS=""
ENV CRYPTO="-Dapp.crypto.password=public"
ENV API="http://api:8081/${APP}-api"
ENV JAVA_OPTIONS="-Dsecurity=Rest -Dsso.${APP}.url=${API}/rest/security/login -D${APP}.endpoint.manage.url=${API}/manage -D${APP}.endpoint.api.url=${API}/rest -D${APP}.endpoint.plugins.url=${API}/webjars -Dserver.context-path=${CONTEXT_URL}"
CMD dockerize -wait ${API}/manage/health -timeout 300s java $JAVA_OPTIONS -jar $SERVER_HOME/ligoj-ui.war
CMD java $JAVA_MEMORY $JAVA_OPTIONS $CUSTOM_OPTS $CRYPTO -jar $SERVER_HOME/ligoj-ui.war
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
CMD curl --fail http://localhost:8080${CONTEXT_URL}/login.html || exit 1
