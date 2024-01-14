ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG JAVA_VERSION="21-jdk"
ARG MAVEN_VERSION="3.9.5-amazoncorretto-21-debian-bookworm"

FROM --platform=${BUILDPLATFORM} maven:${MAVEN_VERSION} as builder
WORKDIR /build/
ADD . .
COPY Dockerfile ./*.m2 /root/.m2/
RUN export MAVEN_OPTS="-Dmaven.test.skip=true -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.resolver.transport=wagon" && \
    { [ -f prepare-build.sh ] && chmod +x prepare-build.sh && . ./prepare-build.sh || echo "No defined prepare build instruction, create a prepare-build.sh script to prepare http_proxy or other custom configurations."; } && \
    mvn clean package -B

FROM --platform=${TARGETPLATFORM} openjdk:${JAVA_VERSION}
ARG VERSION="4.0.1-SNAPSHOT"
ARG ARTIFACT_ID="app-api"
ARG SERVER_HOME="/usr/local/ligoj"
ARG GIT_COMMIT=0

LABEL name="Ligoj API server" \
      maintainer="Kloudy <fdaugan@kloudy.io>" \
      vendor="Kloudy" \
      version="${VERSION}" \
      release="${VERSION}" \
      git.commit="${GIT_COMMIT}" \
      url="https://ligoj.io" \
      summary="The REST API server of Ligoj." \
      description="The REST API server of Ligoj." \
      run="docker run -d --name NAME -p 8081:8081 IMAGE" \
      stop="docker stop NAME" \
      com.sonatype.license="MIT" \
      io.k8s.description="The REST API server of Ligoj." \
      io.k8s.display-name="Ligoj API server" \
      io.openshift.expose-services="8081:8081" \
      io.openshift.tags="Ligoj,API"

WORKDIR "${SERVER_HOME}"

COPY --from=builder /build/target/*.war ${ARTIFACT_ID}.war
COPY Dockerfile ./*prepare-run.sh ./*prepare-cmd.sh ./

# Policy file for JMX
ADD src/test/resources/ligoj.policy "${SERVER_HOME}/ligoj.policy"

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

RUN { [ -f prepare-run.sh ] && chmod +x prepare-run.sh && . ./prepare-run.sh || echo "No defined prepare run instruction, create a prepare-run.sh script to add custom packages before main RUN."; }

CMD { [ -d "$LIGOJ_HOME" ] || mkdir -p "$LIGOJ_HOME"; } && \
    { [ -f prepare-cmd.sh ] && chmod +x prepare-cmd.sh && . ./prepare-cmd.sh || echo "No defined prepare cmd instruction, create a prepare-cmd.sh script to prepare http_proxy or other custom configurations."; } && \
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
	 --add-opens java.base/java.util=ALL-UNNAMED \
	 --add-opens java.base/java.util.regex=ALL-UNNAMED \
	 --add-opens java.base/sun.nio.ch=ALL-UNNAMED \
	 --add-opens java.base/jdk.internal.util.jar=ALL-UNNAMED \
	 --add-opens java.xml/jdk.xml.internal=ALL-UNNAMED \
	 --add-opens java.xml/javax.xml.catalog=ALL-UNNAMED \
	 --add-opens jdk.management/com.sun.management.internal=ALL-UNNAMED \
	 --add-opens jdk.management.jfr/jdk.management.jfr=ALL-UNNAMED \
	 --add-exports java.base/jdk.internal.ref=ALL-UNNAMED \
	 --add-exports java.naming/com.sun.jndi.ldap=ALL-UNNAMED \
	 --add-opens java.management/sun.management=ALL-UNNAMED \
     -Dserver.address="${SERVER_HOST}" \
     -Dserver.port="${SERVER_PORT}" \
     -Dserver.servlet.context-path="${CONTEXT_URL}" \
     -Djavax.net.ssl.trustStorePassword=changeit \
     -Djava.security.policy="${SERVER_HOME}/ligoj.policy" \
     -Djava.net.preferIPv4Stack=true \
     -Dligoj.home="${LIGOJ_HOME}" \
     -jar "${ARTIFACT_ID}.war"

HEALTHCHECK --interval=10s --timeout=2s --retries=5 --start-period=30s \
CMD curl --fail http://localhost:${SERVER_PORT}${CONTEXT_URL}/manage/health || exit 1
