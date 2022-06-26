FROM --platform=linux/amd64 openjdk:17-jdk-alpine
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

# ARGS (build)
ARG GROUP_ID="org.ligoj.app"
ARG ARTIFACT_ID="app-ui"
ARG NEXUS_HOST="oss.sonatype.org"
ARG VERSION="3.2.3"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ARG SERVER_HOME="/usr/local/ligoj"
ARG WAR="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"

ADD ${WAR} "${SERVER_HOME}/${ARTIFACT_ID}.war"
WORKDIR "${SERVER_HOME}"

# ENV (run)
ENV ENDPOINT="http://ligoj-api:8081/ligoj-api" \
    CONTEXT_URL="/ligoj" \
    LIGOJ_HOME=/home/ligoj \
    JAVA_MEMORY="-Xms128M -Xmx128M" \
    SERVER_PORT="8080" \
    CUSTOM_OPTS="" \
    CRYPTO="-Dapp.crypto.password=public" \
    SERVER_HOME="${SERVER_HOME}" \
    ARTIFACT_ID="${ARTIFACT_ID}" \
    JAVA_OPTIONS="-Dsecurity=Rest"

EXPOSE ${SERVER_PORT}
CMD mkdir -p "$LIGOJ_HOME" && \
  java $JAVA_MEMORY $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
    -Dligoj.endpoint="${ENDPOINT}" \
    -Djavax.net.ssl.trustStorePassword=changeit \
    -Dserver.servlet.context-path="${CONTEXT_URL}" \
    -Dserver.port="${SERVER_PORT}" \
    -Djava.net.preferIPv4Stack=true \
    -Djavax.net.ssl.trustStorePassword=changeit \
    -jar ${SERVER_HOME}/${ARTIFACT_ID}.war

HEALTHCHECK --interval=10s --timeout=1s --retries=3 --start-period=5s \
CMD curl --fail -s http://localhost:${SERVER_PORT}${CONTEXT_URL}/favicon.ico || exit 1
