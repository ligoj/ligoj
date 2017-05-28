FROM jetty:9.4.5
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing && \
  apt-get install -y \
   curl \
   unzip

ARG GROUP_ID="org.ligoj.app"
ARG APP="ligoj"
ARG ARTIFACT_ID="app-web"
ARG NEXUS_HOST="oss.sonatype.org"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ENV CONTEXT "${APP}"
ENV CONTEXT_URL "/ligoj"
ARG VERSION
ARG WAR_URL="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"

ENV DOCKERIZE_VERSION v0.4.0

RUN set -xe \
  echo "Downloading application ${WAR_URL}" && \
        curl -sSL "${WAR_URL}" -o "tmp.war" && \
  echo "Preparing application" && \
        unzip -o -q "tmp.war" -d "$JETTY_BASE/webapps/$CONTEXT" && \
        chown -R jetty:jetty "$JETTY_BASE/webapps/$CONTEXT" && \
        chmod -R ug=rX,o= "$JETTY_BASE/webapps/$CONTEXT" && \
  echo "Install Dockerize" && \
        curl -sSL https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz -o "dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz" && \
        tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz && \
        rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz && \
   echo "Cleaning" && \
        rm -f "tmp.war" && \
        apt-get purge -y --auto-remove curl unzip

ENV ENVIRONMENT="-prod" JAVA_MEMORY="-Xms128M -Xmx128M" CUSTOM_OPTS=""
ENV BUSINESS="http://${APP}-business:8080/${APP}-business"
ENV JAVA_OPTIONS="-Dsecurity=Rest -Dsso.${APP}.url=${BUSINESS}/rest/security/login -D${APP}.endpoint.url=${BUSINESS}/rest -Dligoj.plugins.endpoint.url=${BUSINESS}/webjars -Dapp.crypto.password=public -Dapp-env=$ENVIRONMENT $JAVA_MEMORY -Djetty.contextPath=${CONTEXT_URL} $CUSTOM_OPTS"
CMD dockerize -wait ${BUSINESS} -timeout 300s java $JAVA_OPTIONS -jar /usr/local/jetty/start.jar