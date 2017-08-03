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
#ARG WAR_URL="${NEXUS_URL}/service/local/repositories/orgligoj-1087/content/org/${APP}/app/${ARTIFACT_ID}/${VERSION}/${ARTIFACT_ID}-${VERSION}.war"
ENV SERVER_HOME /usr/local/ligoj
RUN mkdir -p "$SERVER_HOME"
WORKDIR $SERVER_HOME

RUN set -xe \
  echo "Downloading application ${WAR_URL}" && \
        curl -sSL "${WAR_URL}" -o "ligoj-ui.war" && \
  echo "Cleaning" && \
        apt-get purge -y --auto-remove curl

ENV JAVA_MEMORY="-Xms128M -Xmx128M"
ENV CUSTOM_OPTS=""
ENV CRYPTO="-Dapp.crypto.password=public"
ENV ENDPOINT_API="http://api:8081/${APP}-api/rest"
ENV ENDPOINT_SSO="http://api:8081/${APP}-api/rest/security/login"
ENV ENDPOINT_MANAGE="http://api:8081/${APP}-api/manage"
ENV ENDPOINT_PLUGINS="http://api:8081/${APP}-api/webjars"
ENV JAVA_OPTIONS="-Dsecurity=Rest -Dserver.context-path=${CONTEXT_URL}"
CMD java $JAVA_MEMORY $JAVA_OPTIONS $CUSTOM_OPTS $CRYPTO \
 -Dsso.${APP}.url=${ENDPOINT_SSO} \
 -D${APP}.endpoint.manage.url=${ENDPOINT_MANAGE} \
 -D${APP}.endpoint.api.url=${ENDPOINT_API} \
 -D${APP}.endpoint.plugins.url=${ENDPOINT_PLUGINS} \
 -jar $SERVER_HOME/ligoj-ui.war
HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
CMD curl --fail http://localhost:8080${CONTEXT_URL}/login.html || exit 1
