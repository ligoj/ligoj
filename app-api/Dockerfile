FROM openjdk:8-jre
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing && \
  apt-get install -y \
   curl \
   mysql-client

ARG APP="ligoj"
ARG GROUP_ID="org.${APP}.app"
ARG ARTIFACT_ID="app-api"
ARG NEXUS_HOST="oss.sonatype.org"
ARG NEXUS_URL="https://${NEXUS_HOST}"
ENV CONTEXT "${APP}-api"
ENV CONTEXT_URL "/${CONTEXT}"
ARG VERSION
ARG WAR_URL="${NEXUS_URL}/service/local/artifact/maven/redirect?r=public&g=${GROUP_ID}&a=${ARTIFACT_ID}&v=${VERSION}&p=war"
#ARG WAR_URL="${NEXUS_URL}/service/local/repositories/orgligoj-1068/content/org/${APP}/app/${ARTIFACT_ID}/${VERSION}/${ARTIFACT_ID}-${VERSION}.war"
ENV LIGOJ_HOME /usr/local/ligoj
RUN mkdir -p "$LIGOJ_HOME"
WORKDIR $LIGOJ_HOME

RUN set -xe \
  echo "Downloading application ${WAR_URL}" && \
        curl -sSL "${WAR_URL}" -o "ligoj-api.war" && \
  echo "Cleaning" && \
        apt-get purge -y --auto-remove curl

COPY wait-for-mysql.sh ./wait-for-mysql.sh
RUN chmod +x ./wait-for-mysql.sh

ENV ENVIRONMENT="JAVA_MEMORY="-Xms712M -Xmx1024M" CUSTOM_OPTS="-Ddatabase.app.hbm2ddl=update"
ENV DATABASE="ligoj-db"
ENV jdbc.url="jdbc:mysql://$DATABASE:3306/ligoj?useColumnNamesInFindColumn=true&useUnicode=yes&characterEncoding=UTF-8&autoReconnect=true&maxReconnects=10&useLegacyDatetimeCode=false&serverTimezone=UTC"
ENV jdbc.username="ligoj" jdbc.password="ligoj"
ENV JAVA_OPTIONS="-Dapp.crypto.password=public -Duser.timezone=UTC $JAVA_MEMORY -Dserver.context-path=${CONTEXT_URL} -Dligoj.home=${LIGOJ_HOME} $CUSTOM_OPTS"

CMD ./wait-for-mysql.sh $DATABASE java $JAVA_OPTIONS -jar $LIGOJ_HOME/ligoj-api.war
