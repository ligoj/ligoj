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
ARG ARTIFACT_ID="${APP}-business"
ARG NEXUS_HOST="oss.sonatype.org"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ENV CONTEXT "${APP}-business"
ENV CONTEXT_URL "/${CONTEXT}"
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

ENV ENVIRONMENT="-prod" JAVA_MEMORY="-Xms712M -Xmx1024M" CUSTOM_OPTS="-Ddatabase.${APP}.hbm2ddl=update"
ENV LIGOJ_HOME="$JETTY_BASE"
ENV JAVA_OPTIONS="-Dapp.crypto.password=public -Dapp-env=$ENVIRONMENT -Duser.timezone=UTC $JAVA_MEMORY -Djetty.contextPath=${CONTEXT_URL} -Dligoj.home=${LIGOJ_HOME} $CUSTOM_OPTS"

# COPY security.key $JETTY_HOME
# COPY admin.confidential.properties $JETTY_HOME/resources/admin.confidential.properties
# ENV JAVA_OPTIONS "-Dapp.crypto.file=$JETTY_HOME/security.key -Dapp-env=$ENVIRONMENT $JAVA_MEMORY $CUSTOM_OPTS"
# HEALTHCHECK --interval=10s --retries=4 --timeout=5s \
#  CMD curl -f http://localhost:8080$CONTEXT_URL || exit 1
