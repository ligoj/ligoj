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

# Maven profiles to activate for the build. Defaults to the three JDBC-driver
# profiles so the image can talk to any of them. These are <activeByDefault> in
# app-api/pom.xml, BUT Maven disables every activeByDefault profile as soon as a
# settings.xml <activeProfiles> (or any -P) is in play — which silently dropped
# ALL DB drivers from the war (org.postgresql.Driver / mysql / mariadb absent →
# the app fails at boot with ClassNotFoundException). Listing them explicitly
# makes the image DB-capable regardless of the build's settings.xml. Override
# with --build-arg MAVEN_PROFILES="db-postgresql" to slim the war to one driver.
ARG MAVEN_PROFILES="db-postgresql,db-mysql,db-mariadb"

# Optional custom Maven settings. The Dockerfile is included as a guaranteed-existing
# placeholder so the COPY never fails when no *.m2 file is present in the context.
COPY Dockerfile ./*.m2 /root/.m2/

# Resolve dependencies first to maximize layer cache reuse across source changes.
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2/repository,sharing=locked \
    if [ "$MAVEN_INSECURE_TLS" = "true" ]; then \
      export MAVEN_OPTS="-Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.resolver.transport=wagon"; \
    fi && \
    mvn -B -ntp -DskipTests ${MAVEN_PROFILES:+-P${MAVEN_PROFILES}} dependency:go-offline || true

# Git provenance, injected from the host (see compose.yml). Defaults match the
# buildnumber-maven-plugin's own fallbacks so an unset host env is harmless.
ARG GIT_COMMIT=0
ARG GIT_BRANCH=UNKNOWN_BRANCH
ARG GIT_COMMIT_TIME=1970-01-01T00:00:00Z

# Password of the bundled plugin-vendors-default.p12 truststore built by
# prepare-build.sh from plugin-vendors/*.cer (public certificates only, so the
# default is fine). Must match ligoj.plugin.signature.truststore.password when
# overridden.
ARG PLUGIN_VENDORS_STOREPASS="changeit"

# Build. Custom build-time setup (proxies, etc.) lives in prepare-build.sh.
COPY . .
RUN --mount=type=cache,target=/root/.m2/repository,sharing=locked \
    if [ "$MAVEN_INSECURE_TLS" = "true" ]; then \
      export MAVEN_OPTS="-Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.resolver.transport=wagon"; \
    fi && \
    { [ -f prepare-build.sh ] && chmod +x prepare-build.sh && . ./prepare-build.sh || \
      echo "No prepare-build.sh; skipping custom build setup."; } && \
    mvn -B -ntp -DskipTests ${MAVEN_PROFILES:+-P${MAVEN_PROFILES}} \
        -DbuildNumber="$GIT_COMMIT" \
        -DscmBranch="$GIT_BRANCH" \
        -Dtimestamp="$GIT_COMMIT_TIME" \
        clean package

# Plugin vendors truststore escape hatch: a prebuilt `plugin-vendors/plugin-vendors-default.p12`
# provided in the build context is bundled as-is, taking precedence over the one
# prepare-build.sh may have generated from `plugin-vendors/*.cer`.
RUN if [ -f plugin-vendors/plugin-vendors-default.p12 ]; then \
      echo "Bundling the prebuilt plugin-vendors/plugin-vendors-default.p12 truststore"; \
      cp -f plugin-vendors/plugin-vendors-default.p12 plugin-vendors-default.p12; \
    fi

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
# Default plugin vendors truststore produced by prepare-build.sh from
# plugin-vendors/*.cer, when any. Installed into LIGOJ_HOME at startup (see
# INSTALL_PLUGIN_VENDORS below). Dockerfile is the guaranteed-existing glob
# placeholder so the COPY never fails when the truststore was not built.
COPY --chown=ligoj:ligoj --from=builder /build/Dockerfile /build/plugin-vendors-default.p12* ./
# TODO: move ligoj.policy out of src/test/resources into src/main/resources.
COPY --chown=ligoj:ligoj src/test/resources/ligoj.policy "${SERVER_HOME}/ligoj.policy"

# JDK_JAVA_OPTIONS is read automatically by the java launcher, so we keep the
# long --add-opens / --add-exports list out of the CMD line.
ENV CONTEXT_URL="/ligoj-api" \
    SERVER_HOST="0.0.0.0" \
    SERVER_PORT="8081" \
    LIGOJ_HOME=/home/ligoj \
    INSTALL_PLUGIN_VENDORS="true" \
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
{ [ \"$INSTALL_PLUGIN_VENDORS\" != 'false' ] && [ -f plugin-vendors-default.p12 ] && [ ! -f \"$LIGOJ_HOME/plugin-vendors.p12\" ] && \
  cp plugin-vendors-default.p12 \"$LIGOJ_HOME/plugin-vendors.p12\" && \
  echo 'Bundled plugin-vendors.p12 installed into LIGOJ_HOME' || true; } && \
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
