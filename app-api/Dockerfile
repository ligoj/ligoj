FROM jetty:9.4.5
LABEL maintainer "fabrice.daugan@gmail.com,alocquet@gmail.com"

RUN set -xe \
  apt-get update && \
  apt-get update --fix-missing && \
  apt-get install -y \
   curl \
   unzip \
   mysql-client

ARG GROUP_ID="org.ligoj.app"
ARG APP="ligoj"
ARG ARTIFACT_ID="app-business"
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

COPY wait-for-mysql.sh ./wait-for-mysql.sh
RUN chmod +x ./wait-for-mysql.sh

ENV ENVIRONMENT="-prod" JAVA_MEMORY="-Xms712M -Xmx1024M" CUSTOM_OPTS="-Ddatabase.app.hbm2ddl=update"
ENV LIGOJ_HOME="$JETTY_BASE"

ENV DATABASE="db"
ENV jdbc.url="jdbc:mysql://$DATABASE:3306/ligoj?useColumnNamesInFindColumn=true&useUnicode=yes&characterEncoding=UTF-8&autoReconnect=true&maxReconnects=10&useLegacyDatetimeCode=false&serverTimezone=UTC"
ENV jdbc.username="ligoj" jdbc.password="ligoj"
ENV JAVA_OPTIONS="-Dapp.crypto.password=public -Dapp-env=$ENVIRONMENT -Duser.timezone=UTC $JAVA_MEMORY -Djetty.contextPath=${CONTEXT_URL} -Dligoj.home=${LIGOJ_HOME} $CUSTOM_OPTS"

CMD ./wait-for-mysql.sh $DATABASE java $JAVA_OPTIONS -jar /usr/local/jetty/start.jar
