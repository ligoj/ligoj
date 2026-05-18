# syntax=docker/dockerfile:1.7
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG JAVA_VERSION="21"
ARG MAVEN_VERSION="3.9.6-amazoncorretto-21-debian-bookworm"

# ---------- Build stage ----------
FROM --platform=${BUILDPLATFORM} maven:${MAVEN_VERSION} AS builder
WORKDIR /build

# Opt-in: disable Maven's HTTPS certificate and hostname validation.
# Intended for builds against trusted internal mirrors with self-signed certs.
# Enable with: --build-arg MAVEN_INSECURE_TLS=true
ARG MAVEN_INSECURE_TLS="false"

# Optional custom Maven settings. The Dockerfile is included as a guaranteed-existing
# placeholder so the COPY never fails when no *.m2 file is present in the context.
COPY Dockerfile ./*.m2 /root/.m2/

# Resolve dependencies first to maximize layer cache reuse across source changes.
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2/repository,sharing=locked \
    if [ "$MAVEN_INSECURE_TLS" = "true" ]; then \
      export MAVEN_OPTS="-Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.resolver.transport=wagon"; \
    fi && \
    mvn -B -ntp -DskipTests dependency:go-offline || true

# Git provenance, injected from the host (see compose.yml). Defaults match the
# buildnumber-maven-plugin's own fallbacks so an unset host env is harmless.
ARG GIT_COMMIT=0
ARG GIT_BRANCH=UNKNOWN_BRANCH
ARG GIT_COMMIT_TIME=1970-01-01T00:00:00Z

# Build. Custom build-time setup (proxies, etc.) lives in prepare-build.sh.
COPY . .
RUN --mount=type=cache,target=/root/.m2/repository,sharing=locked \
    if [ "$MAVEN_INSECURE_TLS" = "true" ]; then \
      export MAVEN_OPTS="-Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.resolver.transport=wagon"; \
    fi && \
    { [ -f prepare-build.sh ] && chmod +x prepare-build.sh && . ./prepare-build.sh || \
      echo "No prepare-build.sh; skipping custom build setup."; } && \
    mvn -B -ntp -DskipTests \
        -DbuildNumber="$GIT_COMMIT" \
        -DscmBranch="$GIT_BRANCH" \
        -Dtimestamp="$GIT_COMMIT_TIME" \
        clean package

# ---------- Runtime stage ----------
FROM --platform=${TARGETPLATFORM} eclipse-temurin:${JAVA_VERSION}-jre AS runtime
ARG VERSION="4.0.1-SNAPSHOT"
ARG ARTIFACT_ID="app-api"
ARG SERVER_HOME="/usr/local/ligoj"
ARG GIT_COMMIT=0

LABEL org.opencontainers.image.title="Ligoj API server" \
      org.opencontainers.image.description="The REST API server of Ligoj." \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.url="https://ligoj.io" \
      org.opencontainers.image.vendor="Kloudy" \
      org.opencontainers.image.licenses="MIT" \
      maintainer="Kloudy <fdaugan@kloudy.io>" \
      io.k8s.description="The REST API server of Ligoj." \
      io.k8s.display-name="Ligoj API server" \
      io.openshift.expose-services="8081:8081" \
      io.openshift.tags="Ligoj,API"

# curl: HEALTHCHECK probe. tini: PID 1, reaps zombies and forwards SIGTERM to the JVM.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl tini && \
    rm -rf /var/lib/apt/lists/*

# Non-root runtime user.
RUN groupadd --system --gid 1001 ligoj && \
    useradd  --system --uid 1001 --gid 1001 --home-dir /home/ligoj --shell /usr/sbin/nologin ligoj && \
    mkdir -p /home/ligoj "${SERVER_HOME}" && \
    chown -R ligoj:ligoj /home/ligoj "${SERVER_HOME}"

WORKDIR "${SERVER_HOME}"

COPY --chown=ligoj:ligoj --from=builder /build/target/*.war ${ARTIFACT_ID}.war
# Dockerfile is included as a glob placeholder (same trick as the build stage).
COPY --chown=ligoj:ligoj Dockerfile ./*prepare-run.sh ./*prepare-cmd.sh ./
# TODO: move ligoj.policy out of src/test/resources into src/main/resources.
COPY --chown=ligoj:ligoj src/test/resources/ligoj.policy "${SERVER_HOME}/ligoj.policy"

# JDK_JAVA_OPTIONS is read automatically by the java launcher, so we keep the
# long --add-opens / --add-exports list out of the CMD line.
ENV CONTEXT_URL="/ligoj-api" \
    SERVER_HOST="0.0.0.0" \
    SERVER_PORT="8081" \
    LIGOJ_HOME=/home/ligoj \
    CUSTOM_OPTS="-Djdbc.host=ligoj-db -Dmanagement.endpoint.sbom.application.location=classpath:bom.json" \
    CRYPTO="-Dapp.crypto.password=public" \
    SERVER_HOME="${SERVER_HOME}" \
    ARTIFACT_ID="${ARTIFACT_ID}" \
    JAVA_MEMORY="" \
    JAVA_OPTIONS="-Duser.timezone=UTC" \
    JDK_JAVA_OPTIONS="--enable-preview \
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
--add-opens java.management/sun.management=ALL-UNNAMED \
--add-exports java.base/jdk.internal.ref=ALL-UNNAMED \
--add-exports java.naming/com.sun.jndi.ldap=ALL-UNNAMED"

EXPOSE ${SERVER_PORT}

# prepare-run runs at build time (if present); needs root for package installs.
RUN { [ -f prepare-run.sh ] && chmod +x prepare-run.sh && . ./prepare-run.sh || \
      echo "No prepare-run.sh; skipping custom runtime setup."; }

USER ligoj:ligoj

# tini = PID 1; exec java = clean signal delivery to the JVM.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "\
mkdir -p \"$LIGOJ_HOME\" && \
{ [ -f prepare-cmd.sh ] && chmod +x prepare-cmd.sh && . ./prepare-cmd.sh || \
  echo 'No prepare-cmd.sh; skipping custom startup.'; } && \
exec java $JAVA_MEMORY $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
  -Djava.security.policy=\"${SERVER_HOME}/ligoj.policy\" \
  -Dserver.address=\"${SERVER_HOST}\" \
  -Dserver.port=\"${SERVER_PORT}\" \
  -Dserver.servlet.context-path=\"${CONTEXT_URL}\" \
  -Djavax.net.ssl.trustStorePassword=changeit \
  -Djava.net.preferIPv4Stack=true \
  -Dligoj.home=\"${LIGOJ_HOME}\" \
  -jar \"${ARTIFACT_ID}.war\""]

HEALTHCHECK --interval=10s --timeout=2s --retries=5 --start-period=30s \
  CMD curl --fail -s "http://localhost:${SERVER_PORT}${CONTEXT_URL}/manage/health" || exit 1
