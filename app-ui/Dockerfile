ARG BUILDPLATFORM
FROM --platform=${BUILDPLATFORM} node:16.20-bookworm-slim as builder_node
WORKDIR /build/
ADD src/main/build src/main/build
ADD src/main/webapp src/main/webapp
COPY Dockerfile ./*prepare-build.sh ./
RUN touch ~/.bash_profile && \
    { [ -f prepare-build.sh ] && chmod +x prepare-build.sh && . ./prepare-build.sh || echo "No defined prepare build instruction, create a prepare-build.sh script to prepare http_proxy or other custom configurations."; } && \
    npm install -g clean-css-cli@5.6.2 && \
    mkdir -p src/main/build && mkdir -p src/main/webapp && \
    chmod +x src/main/build/minify.sh && src/main/build/minify.sh

ARG BUILDPLATFORM
FROM --platform=${BUILDPLATFORM} maven:3.9.4-amazoncorretto-21-debian-bookworm as builder
WORKDIR /build/
ADD . .
COPY Dockerfile ./*settings.xml /root/.m2/
COPY --from=builder_node /build/src/main/webapp src/main/webapp
RUN export MAVEN_OPTS="-Dmaven.test.skip=true -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.resolver.transport=wagon" && \
    { [ -f prepare-build.sh ] && chmod +x prepare-build.sh && . ./prepare-build.sh || echo "No defined prepare build instruction, create a prepare-build.sh script to prepare http_proxy or other custom configurations."; } && \
    mvn clean package -B

ARG TARGETPLATFORM
FROM --platform=${TARGETPLATFORM} openjdk:21-jdk
LABEL name="Ligoj UI server" \
      maintainer="Kloudy <fdaugan@kloudy.io>" \
      vendor="Kloudy" \
      version="3.3.0-SNAPSHOT" \
      release="3.3.0-SNAPSHOT" \
      url="https://ligoj.io" \
      summary="The UI server of Ligoj." \
      description="The UI server of Ligoj." \
      run="docker run -d --name NAME -p 8081:8081 IMAGE" \
      stop="docker stop NAME" \
      com.sonatype.license="MIT" \
      io.k8s.description="The UI server of Ligoj." \
      io.k8s.display-name="Ligoj UI server" \
      io.openshift.expose-services="8080:8080" \
      io.openshift.tags="Ligoj,UI"

# ARGS (build)
ARG ARTIFACT_ID="app-ui"
ARG SERVER_HOME="/usr/local/ligoj"
COPY --from=builder /build/target/*.war ${SERVER_HOME}/${ARTIFACT_ID}.war
COPY Dockerfile ./*prepare-run.sh ./

WORKDIR "${SERVER_HOME}"

# ENV (run)
ENV ENDPOINT="http://ligoj-api:8081/ligoj-api" \
    CONTEXT_URL="/ligoj" \
    LIGOJ_HOME=/home/ligoj \
    JAVA_MEMORY="-Xms128M -Xmx128M" \
    SERVER_HOST="0.0.0.0" \
    SERVER_PORT="8080" \
    CUSTOM_OPTS="" \
    CRYPTO="-Dapp.crypto.password=public" \
    SERVER_HOME="${SERVER_HOME}" \
    ARTIFACT_ID="${ARTIFACT_ID}" \
    PREPARE_RUN="echo 'No defined prepare run instruction, set PREPARE_RUN to insert HTTP_PROXY instructions for sample.'" \
    JAVA_OPTIONS="-Duser.timezone=UTC -Dsecurity=Rest"

EXPOSE ${SERVER_PORT}
CMD { [ -d "$LIGOJ_HOME" ] || mkdir -p "$LIGOJ_HOME"; }  && ${PREPARE_RUN} && \
    { [ -f prepare-run.sh ] && chmod +x prepare-run.sh && . ./prepare-run.sh || echo "No defined prepare run instruction, create a prepare-run.sh script to prepare http_proxy or other custom configurations."; } && \
    java $JAVA_MEMORY $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
     -Dligoj.endpoint="${ENDPOINT}" \
     -Dserver.address="${SERVER_HOST}" \
     -Dserver.port="${SERVER_PORT}" \
     -Dserver.servlet.context-path="${CONTEXT_URL}" \
     -Djavax.net.ssl.trustStorePassword=changeit \
     -Djava.net.preferIPv4Stack=true \
     -Dligoj.home="${LIGOJ_HOME}" \
     -jar "${SERVER_HOME}/${ARTIFACT_ID}.war"

HEALTHCHECK --interval=10s --timeout=1s --retries=3 --start-period=5s \
CMD curl --fail -s http://localhost:${SERVER_PORT}${CONTEXT_URL}/favicon.ico || exit 1
