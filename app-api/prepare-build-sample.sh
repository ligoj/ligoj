#!/bin/bash
# Sample build-time preparation script for the Maven builder stage.
#
# Imports private / self-signed CA certificates into:
#   1) the system trust store (so curl, apt, npm, ... trust them);
#   2) the JDK cacerts (so Maven Resolver / wagon work over HTTPS).
#
# With CAs trusted you do NOT need to pass --build-arg MAVEN_INSECURE_TLS=true;
# the build keeps full TLS verification against your internal mirror.
#
# Usage
# -----
# 1. Drop one or more PEM-encoded CA certificates into a `.ca/` directory next
#    to this script. They will be part of the Docker build context.
#    Accepted extensions: *.pem, *.crt.
# 2. Rename this file to `prepare-build.sh` so the Dockerfile sources it.
#
# This script is *sourced* by the Dockerfile (`. ./prepare-build.sh`), so it
# runs in the same shell as the subsequent `mvn` invocation. It deliberately
# does NOT use `set -e` to avoid leaking that setting to the parent shell.

CA_DIR="${CA_DIR:-./.ca}"
CACERTS_PASSWORD="${CACERTS_PASSWORD:-changeit}"
KEYSTORE="${JAVA_HOME:-/opt/java/openjdk}/lib/security/cacerts"

if [ ! -d "$CA_DIR" ] || [ -z "$(ls -A "$CA_DIR" 2>/dev/null)" ]; then
  echo "prepare-build.sh: no certs in $CA_DIR; nothing to import."
  return 0 2>/dev/null || exit 0
fi

# 1) System-wide trust (Debian-based builder image).
if command -v update-ca-certificates >/dev/null 2>&1; then
  mkdir -p /usr/local/share/ca-certificates
  for cert in "$CA_DIR"/*.pem "$CA_DIR"/*.crt; do
    [ -e "$cert" ] || continue
    cp "$cert" "/usr/local/share/ca-certificates/$(basename "${cert%.*}").crt"
  done
  update-ca-certificates >/dev/null
fi

# 2) JDK trust — required for Maven over HTTPS.
for cert in "$CA_DIR"/*.pem "$CA_DIR"/*.crt; do
  [ -e "$cert" ] || continue
  alias="ligoj-build-$(basename "${cert%.*}")"
  echo "prepare-build.sh: importing $cert as alias '$alias' into $KEYSTORE"
  # Remove any prior entry under the same alias so the script is idempotent.
  keytool -delete -alias "$alias" -keystore "$KEYSTORE" \
          -storepass "$CACERTS_PASSWORD" >/dev/null 2>&1 || true
  keytool -importcert -noprompt -trustcacerts \
          -alias "$alias" \
          -file "$cert" \
          -keystore "$KEYSTORE" \
          -storepass "$CACERTS_PASSWORD"
done
