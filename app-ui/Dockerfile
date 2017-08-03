FROM openjdk:8-jre
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing && \
  apt-get install -y \
   curl

# ARGS (build)
ARG APP="ligoj"
ARG GROUP_ID="org.${APP}.app"
ARG ARTIFACT_ID="app-ui"
ARG NEXUS_HOST="oss.sonatype.org"
ARG VERSION
ARG NEXUS_URL="https://${NEXUS_HOST}"
ARG SERVER_HOME="/usr/local/ligoj"
ARG WAR_URL="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"

RUN set -xe && \
  mkdir -p "${SERVER_HOME}" && \
  echo "Downloading application ${WAR_URL}" && \
        curl -sSL "${WAR_URL}" -o "${ARTIFACT_ID}.war" && \
  echo "Cleaning" && \
        apt-get purge -y --auto-remove curl

# ENV (run)
ENV CONTEXT "${APP}"
ENV CONTEXT_URL="/${CONTEXT}" \
    LIGOJ_HOME=/home/ligoj \
    JAVA_MEMORY="-Xms128M -Xmx128M" \
    SERVER_PORT="8080" \
    CUSTOM_OPTS="" \
    CRYPTO="-Dapp.crypto.password=public" \
    ENDPOINT_API="http://api:8081/${APP}-api/rest" \
    ENDPOINT_SSO="http://api:8081/${APP}-api/rest/security/login" \
    ENDPOINT_MANAGE="http://api:8081/${APP}-api/manage" \
    ENDPOINT_PLUGINS="http://api:8081/${APP}-api/webjars" \
    JAVA_OPTIONS="-Dsecurity=Rest"

WORKDIR ${SERVER_HOME}
EXPOSE ${SERVER_PORT}
CMD java $JAVA_MEMORY $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
 -Dsso.${APP}.url="${ENDPOINT_SSO}" \
 -D${APP}.endpoint.manage.url="${ENDPOINT_MANAGE}" \
 -D${APP}.endpoint.api.url="${ENDPOINT_API}" \
 -D${APP}.endpoint.plugins.url="${ENDPOINT_PLUGINS}" \
 -Dserver.context-path="${CONTEXT_URL}" \
 -Dserver.port="${SERVER_PORT}" \
 -jar ${SERVER_HOME}/${ARTIFACT_ID}.war

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
CMD curl --fail http://localhost:8080${CONTEXT_URL}/login.html || exit 1
