FROM openjdk:8-jre
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing

# ARGS (build)
ARG GROUP_ID="org.ligoj.app"
ARG ARTIFACT_ID="app-api"
ARG NEXUS_HOST="oss.sonatype.org"
ARG VERSION="1.7.1"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ARG SERVER_HOME="/usr/local/ligoj"
ARG WAR="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"

ADD ${WAR} "${SERVER_HOME}/${ARTIFACT_ID}.war"
WORKDIR "${SERVER_HOME}"

# ENV (run)
ENV CONTEXT_URL="/ligoj-api" \
    SERVER_HOST="0.0.0.0" \
    SERVER_PORT="8081" \
    LIGOJ_HOME=/home/ligoj \
    JAVA_MEMORY="-Xms712M -Xmx1024M" \
    CUSTOM_OPTS="-Djpa.hbm2ddl=update -Djdbc.host=ligoj-db" \
    CRYPTO="-Dapp.crypto.password=public" \
    SERVER_HOME="${SERVER_HOME}" \
    ARTIFACT_ID="${ARTIFACT_ID}" \
    JAVA_OPTIONS="-Duser.timezone=UTC"

EXPOSE ${SERVER_PORT}
CMD mkdir -p "$LIGOJ_HOME" && \
  java $JAVA_MEMORY $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
    -Dserver.address="${SERVER_HOST}" \
    -Dserver.port="${SERVER_PORT}" \
    -Dserver.servlet.context-path="${CONTEXT_URL}" \
    -Dligoj.home="${LIGOJ_HOME}" \
    -jar "${SERVER_HOME}/${ARTIFACT_ID}.war"

HEALTHCHECK --interval=10s --timeout=2s --retries=5 --start-period=20s \
CMD curl -v --silent "http://localhost:${SERVER_PORT}${CONTEXT_URL}/manage/health" 2>&1 | grep UP