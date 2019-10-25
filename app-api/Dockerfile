FROM openjdk:11-jre
LABEL maintainer "fabrice.daugan@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing

# ARGS (build)
ARG GROUP_ID="org.ligoj.app"
ARG ARTIFACT_ID="app-api"
ARG NEXUS_HOST="oss.sonatype.org"
ARG VERSION="3.0.6"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ARG SERVER_HOME="/usr/local/ligoj"
ARG WAR="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"

ADD ${WAR} "${SERVER_HOME}/${ARTIFACT_ID}.war"

# Policy file for JMX
ADD src/test/resources/ligoj.policy "${SERVER_HOME}/ligoj.policy"

WORKDIR "${SERVER_HOME}"

# ENV (run)
ENV CONTEXT_URL="/ligoj-api" \
    SERVER_HOST="0.0.0.0" \
    SERVER_PORT="8081" \
    LIGOJ_HOME=/home/ligoj \
    CUSTOM_OPTS="-Djdbc.host=ligoj-db" \
    CRYPTO="-Dapp.crypto.password=public" \
    SERVER_HOME="${SERVER_HOME}" \
    ARTIFACT_ID="${ARTIFACT_ID}" \
    JAVA_OPTIONS="-Duser.timezone=UTC"

EXPOSE ${SERVER_PORT}
CMD mkdir -p "$LIGOJ_HOME" && \
  java $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
	--add-modules java.se \
	--add-opens java.base/jdk.internal.loader=ALL-UNNAMED \
	--add-opens java.base/jdk.internal.module=ALL-UNNAMED \
	--add-opens java.base/jdk.internal.ref=ALL-UNNAMED \
	--add-opens java.base/jdk.internal.perf=ALL-UNNAMED \
	--add-opens java.base/jdk.internal.reflect=ALL-UNNAMED \ 
	--add-opens java.base/jdk.internal.math=ALL-UNNAMED \
	--add-opens java.base/java.lang=ALL-UNNAMED \
	--add-opens java.base/java.nio=ALL-UNNAMED \
	--add-opens java.base/java.lang.module=ALL-UNNAMED \
	--add-opens java.base/java.lang.invoke=ALL-UNNAMED \
    --add-opens java.base/java.lang.package=ALL-UNNAMED \
	--add-opens java.base/java.util=ALL-UNNAMED \
	--add-opens java.base/java.util.regex=ALL-UNNAMED \
	--add-opens java.base/sun.nio.ch=ALL-UNNAMED \
	--add-opens java.base/jdk.internal.util.jar=ALL-UNNAMED \
	--add-opens java.xml/jdk.xml.internal=ALL-UNNAMED \
	--add-opens java.xml/javax.xml.catalog=ALL-UNNAMED \
	--add-opens jdk.management/com.sun.management.internal=ALL-UNNAMED \
	--add-opens jdk.management.jfr/jdk.management.jfr=ALL-UNNAMED\
    -Dserver.address="${SERVER_HOST}" \
    -Dserver.port="${SERVER_PORT}" \
    -Dserver.servlet.context-path="${CONTEXT_URL}" \
    -Djavax.net.ssl.trustStorePassword=changeit \
    -Djava.security.policy="${SERVER_HOME}/ligoj.policy" \
    -Djava.net.preferIPv4Stack=true \
    -Dligoj.home="${LIGOJ_HOME}" \
    -jar "${SERVER_HOME}/${ARTIFACT_ID}.war"

HEALTHCHECK --interval=10s --timeout=1s --retries=5 --start-period=30s \
CMD curl --fail http://localhost:${SERVER_PORT}${CONTEXT_URL}/manage/health || exit 1