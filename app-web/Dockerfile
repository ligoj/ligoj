FROM jetty:9.4.2
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing && \
  apt-get install -y \
   curl \
   unzip

ARG GROUP_ID="org.ligoj.app"
ARG APP="app"
ARG ARTIFACT_ID="${APP}-web"
ARG NEXUS_HOST="oss.sonatype.org"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ENV CONTEXT "${APP}"
ENV CONTEXT_URL "/ligoj"
ARG VERSION
ARG WAR_URL="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"

RUN set -xe \
  echo "Downloading application ${WAR_URL}" && \
        curl -sSL "${WAR_URL}" -o "tmp.war" && \
  echo "Preparing application" && \
        unzip -o -q "tmp.war" -d "$JETTY_BASE/webapps/$CONTEXT" && \
        chown -R jetty:jetty "$JETTY_BASE/webapps/$CONTEXT" && \
        chmod -R ug=rX,o= "$JETTY_BASE/webapps/$CONTEXT" && \
   echo "Cleaning" && \
        rm -f "tmp.war" && \
        apt-get purge -y --auto-remove curl unzip
#        apt-get purge -y --auto-remove ca-certificates curl unzip

ENV ENVIRONMENT="-prod" JAVA_MEMORY="-Xms128M -Xmx128M" CUSTOM_OPTS=""
ENV JAVA_OPTIONS="-Dsso.${APP}.url=http://${APP}-business:8080/${APP}-business/rest/security/login -Dsecurity=Rest -D${APP}.endpoint.url=http://${APP}-business:8080/${APP}-business/rest -Dapp.crypto.password=public -Dapp-env=$ENVIRONMENT $JAVA_MEMORY -Djetty.contextPath=${CONTEXT_URL} $CUSTOM_OPTS"
