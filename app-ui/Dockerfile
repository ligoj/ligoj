# syntax=docker/dockerfile:1.7
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG JAVA_VERSION="21"
ARG JAVA_IMAGE="eclipse-temurin"
ARG NODE_VERSION="24-bookworm-slim"
ARG MAVEN_VERSION="3.9.6-amazoncorretto-21-debian-bookworm"

# ---------- Frontend build stage ----------
FROM --platform=${BUILDPLATFORM} node:${NODE_VERSION} AS builder_node
WORKDIR /build/src/main/webapp

# Install deps first for layer-cache reuse on source-only changes.
COPY src/main/webapp/package.json src/main/webapp/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY src/main/webapp/ ./
# Build with a placeholder base (VITE_BASE) so the SPA is NOT bound to a
# context path at image-build time: the container CMD substitutes
# `/__ligoj_ctx__` with the runtime ${CONTEXT_URL} — context stays a
# run-level choice (no rebuild needed to deploy at root or elsewhere).
RUN VITE_BASE=/__ligoj_ctx__/ npm run build -- --outDir ./vue-dist --emptyOutDir && \
    cp vue-dist/index.html . && \
    cp vue-dist/login.html . && \
    cp vue-dist/login-by-api-key.html . && \
    cp -r vue-dist/assets/ . && \
    rm -rf vue-dist node_modules

# ---------- Maven build stage ----------
FROM --platform=${BUILDPLATFORM} maven:${MAVEN_VERSION} AS builder
WORKDIR /build

# Opt-in: disable Maven's HTTPS certificate and hostname validation.
# Intended for builds against trusted internal mirrors with self-signed certs.
# Enable with: --build-arg MAVEN_INSECURE_TLS=true
ARG MAVEN_INSECURE_TLS="false"

# Optional custom Maven settings (Dockerfile is the always-present glob placeholder).
COPY Dockerfile ./*.m2 /root/.m2/

# Resolve dependencies before pulling in source, so source-only changes reuse cache.
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

COPY . .
COPY --from=builder_node /build/src/main/webapp src/main/webapp
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
FROM --platform=${TARGETPLATFORM} ${JAVA_IMAGE}:${JAVA_VERSION}-jre AS runtime
ARG VERSION="4.0.1-SNAPSHOT"
ARG ARTIFACT_ID="app-ui"
ARG SERVER_HOME="/usr/local/ligoj"
ARG GIT_COMMIT=0

LABEL org.opencontainers.image.title="Ligoj UI server" \
      org.opencontainers.image.description="The UI server of Ligoj." \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.url="https://ligoj.io" \
      org.opencontainers.image.vendor="Kloudy" \
      org.opencontainers.image.licenses="MIT" \
      maintainer="Kloudy <fdaugan@kloudy.io>" \
      io.k8s.description="The UI server of Ligoj." \
      io.k8s.display-name="Ligoj UI server" \
      io.openshift.expose-services="8080:8080" \
      io.openshift.tags="Ligoj,UI"

# curl: HEALTHCHECK probe. tini: PID 1, reaps zombies and forwards SIGTERM.
# unzip: explode the war at image build so the SPA's placeholder base can be
# substituted with the runtime CONTEXT_URL at container start.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl tini unzip && \
    rm -rf /var/lib/apt/lists/*

# Non-root runtime user.
RUN groupadd --system --gid 1001 ligoj && \
    useradd  --system --uid 1001 --gid 1001 --home-dir /home/ligoj --shell /usr/sbin/nologin ligoj && \
    mkdir -p /home/ligoj "${SERVER_HOME}" && \
    chown -R ligoj:ligoj /home/ligoj "${SERVER_HOME}"

WORKDIR "${SERVER_HOME}"

COPY --chown=ligoj:ligoj --from=builder /build/target/*.war ${ARTIFACT_ID}.war
# Explode the war: Spring Boot's WarLauncher runs it in place, and the startup
# CMD can then rewrite the SPA's `/__ligoj_ctx__` base placeholder with the
# runtime ${CONTEXT_URL} (impossible inside a zipped war).
RUN unzip -q ${ARTIFACT_ID}.war -d app && \
    rm ${ARTIFACT_ID}.war && \
    chown -R ligoj:ligoj app
# Dockerfile included as the guaranteed-existing placeholder for the optional globs.
COPY --chown=ligoj:ligoj Dockerfile ./*prepare-run.sh ./*prepare-cmd.sh ./

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

# prepare-run runs at build time; needs root for package installs.
RUN { [ -f prepare-run.sh ] && chmod +x prepare-run.sh && . ./prepare-run.sh || \
      echo "No prepare-run.sh; skipping custom runtime setup."; }

USER ligoj:ligoj

# tini = PID 1; exec java = clean signal delivery to the JVM.
# Startup: normalize CONTEXT_URL (no trailing slash), substitute the SPA's
# `/__ligoj_ctx__` build-time base placeholder with it (HTML/JS/CSS at the
# webapp root — idempotent, a handful of small files), then launch the
# exploded war via Spring Boot's WarLauncher. Context stays run-level: the
# same image serves /ligoj, root ('') or any other context without rebuild.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "\
mkdir -p \"$LIGOJ_HOME\" && \
{ [ -f prepare-cmd.sh ] && chmod +x prepare-cmd.sh && . ./prepare-cmd.sh || \
  echo 'No prepare-cmd.sh; skipping custom startup.'; } && \
CTX=\"${CONTEXT_URL%/}\" && \
find app -maxdepth 2 -type f \\( -name '*.html' -o -name '*.js' -o -name '*.css' \\) \
  -exec sed -i \"s|/__ligoj_ctx__|${CTX}|g\" {} + && \
cd app && \
exec java $JAVA_MEMORY $JAVA_OPTIONS $CRYPTO $CUSTOM_OPTS \
  -Dligoj.endpoint=\"${ENDPOINT}\" \
  -Dserver.address=\"${SERVER_HOST}\" \
  -Dserver.port=\"${SERVER_PORT}\" \
  -Dserver.servlet.context-path=\"${CTX}\" \
  -Djavax.net.ssl.trustStorePassword=changeit \
  -Djava.net.preferIPv4Stack=true \
  -Dligoj.home=\"${LIGOJ_HOME}\" \
  -cp . org.springframework.boot.loader.launch.WarLauncher"]

HEALTHCHECK --interval=10s --timeout=1s --retries=3 --start-period=5s \
  CMD curl --fail -s "http://localhost:${SERVER_PORT}${CONTEXT_URL}/favicon.ico" || exit 1
