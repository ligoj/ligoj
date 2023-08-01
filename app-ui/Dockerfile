FROM maven:3.8.5-openjdk-17 as builder
RUN touch ~/.bash_profile && \
  curl --silent -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
  export NVM_DIR="$HOME/.nvm" && \
  [ -s "$NVM_DIR/nvm.sh" ] && \
  \. "$NVM_DIR/nvm.sh" && \
  nvm install 16 && \
  nvm use 16 && \
  npm --version && \
  node --version && \
  npm install clean-css-cli@5.6.0 --location=global
WORKDIR /build/
RUN mkdir -p src/main/build && mkdir -p src/main/webapp
ADD pom.xml .
ADD src/main/build src/main/build
ADD src/main/webapp src/main/webapp
# Uncomment and configure you custom settings.xml Maven file
# COPY ./settings.xml /root/.m2/settings.xml
RUN mvn clean compile -q -B -Dmaven.test.skip=true -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true

ADD . .
RUN chmod +x src/main/build/minify.sh && src/main/build/minify.sh

RUN source /root/.bash_profile  && \
    mvn package -q -B -Dmaven.test.skip=true -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true

FROM openjdk:17-jdk
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
    JAVA_OPTIONS="-Duser.timezone=UTC -Dsecurity=Rest"

EXPOSE ${SERVER_PORT}
CMD { [ -d "$LIGOJ_HOME" ] || mkdir -p "$LIGOJ_HOME"; } && \
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
