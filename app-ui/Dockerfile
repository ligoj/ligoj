ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG JAVA_VERSION="21-jdk"
ARG NODE_VERSION="20-bookworm-slim"
ARG MAVEN_VERSION="3.9.6-amazoncorretto-21-debian-bookworm"

FROM --platform=${BUILDPLATFORM} node:${NODE_VERSION} as builder_node
WORKDIR /build/
ADD src/main/build src/main/build
ADD src/main/webapp src/main/webapp
COPY Dockerfile ./*prepare-build.sh ./
RUN touch ~/.bash_profile && \
    { [ -f prepare-build.sh ] && chmod +x prepare-build.sh && . ./prepare-build.sh || echo "No defined prepare build instruction, create a prepare-build.sh script to prepare http_proxy or other custom configurations."; } && \
    npm install -g clean-css-cli@5.6.3 && \
    mkdir -p src/main/build && mkdir -p src/main/webapp && \
    chmod +x src/main/build/minify.sh && src/main/build/minify.sh

FROM --platform=${BUILDPLATFORM} maven:${MAVEN_VERSION} as builder
WORKDIR /build/
ADD . .
COPY Dockerfile ./*.m2 /root/.m2/
COPY --from=builder_node /build/src/main/webapp src/main/webapp
RUN export MAVEN_OPTS="-Dmaven.test.skip=true -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.resolver.transport=wagon" && \
    { [ -f prepare-build.sh ] && chmod +x prepare-build.sh && . ./prepare-build.sh || echo "No defined prepare build instruction, create a prepare-build.sh script to prepare http_proxy or other custom configurations."; } && \
    mvn clean package -B

FROM --platform=${TARGETPLATFORM} openjdk:${JAVA_VERSION}
ARG VERSION="4.0.1-SNAPSHOT"
ARG ARTIFACT_ID="app-ui"
ARG SERVER_HOME="/usr/local/ligoj"
ARG GIT_COMMIT=0

LABEL maintainer="Kloudy <fdaugan@kloudy.io>" \
      vendor="Kloudy" \
      version="${VERSION}" \
      release="${VERSION}" \
      git.commit="${GIT_COMMIT}" \
      url="https://ligoj.io" \
      stop="docker stop NAME" \
      com.sonatype.license="MIT" \
      run="docker run -d --name NAME -p 8080:8080 IMAGE" \
      name="Ligoj UI server" \
      summary="The UI server of Ligoj." \
      description="The UI server of Ligoj." \
      io.k8s.description="The UI server of Ligoj." \
      io.k8s.display-name="Ligoj UI server" \
      io.openshift.expose-services="8080:8080" \
      io.openshift.tags="Ligoj,UI"

WORKDIR "${SERVER_HOME}"

COPY --from=builder /build/target/*.war ${ARTIFACT_ID}.war
COPY Dockerfile ./*prepare-run.sh ./*prepare-cmd.sh ./

# ENV (run)
ENV CONTEXT_URL="/ligoj" \
    SERVER_HOST="0.0.0.0" \
    SERVER_PORT="8080" \
    LIGOJ_HOME=/home/ligoj \
    CUSTOM_OPTS="" \
    CRYPTO="-Dapp.crypto.password=public" \
    SERVER_HOME="${SERVER_HOME}" \
    ARTIFACT_ID="${ARTIFACT_ID}" \
    JAVA_MEMORY="-Xms128M -Xmx128M" \
    ENDPOINT="http://ligoj-api:8081/ligoj-api" \
    JAVA_OPTIONS="-Duser.timezone=UTC -Dsecurity=Rest"

EXPOSE ${SERVER_PORT}

RUN { [ -f prepare-run.sh ] && chmod +x prepare-run.sh && . ./prepare-run.sh || echo "No defined prepare run instruction, create a prepare-run.sh script to add custom packages before main RUN."; }

CMD { [ -d "$LIGOJ_HOME" ] || mkdir -p "$LIGOJ_HOME"; } && \
    { [ -f prepare-cmd.sh ] && chmod +x prepare-cmd.sh && . ./prepare-cmd.sh || echo "No defined prepare cmd instruction, create a prepare-cmd.sh script to prepare http_proxy or other custom configurations."; } && \
    java $JAVA_MEMORY $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
     -Dligoj.endpoint="${ENDPOINT}" \
     -Dserver.address="${SERVER_HOST}" \
     -Dserver.port="${SERVER_PORT}" \
     -Dserver.servlet.context-path="${CONTEXT_URL}" \
     -Djavax.net.ssl.trustStorePassword=changeit \
     -Djava.net.preferIPv4Stack=true \
     -Dligoj.home="${LIGOJ_HOME}" \
     -jar "${ARTIFACT_ID}.war"

HEALTHCHECK --interval=10s --timeout=1s --retries=3 --start-period=5s \
CMD curl --fail -s http://localhost:${SERVER_PORT}${CONTEXT_URL}/favicon.ico || exit 1
