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
# It also bundles the default plugin vendors truststore: every `*.cer`
# certificate dropped into a `plugin-vendors/` directory next to this script is
# imported into `plugin-vendors-default.p12`, shipped in the image and installed
# at first container startup as `<ligoj.home>/plugin-vendors.p12`.
#
# Usage
# -----
# 1. Drop one or more PEM-encoded CA certificates into a `.ca/` directory next
#    to this script. They will be part of the Docker build context.
#    Accepted extensions: *.pem, *.crt.
#    And/or drop the trusted plugin vendor certificates (*.cer) into a
#    `plugin-vendors/` directory.
# 2. Rename this file to `prepare-build.sh` so the Dockerfile sources it.
#
# This script is *sourced* by the Dockerfile (`. ./prepare-build.sh`), so it
# runs in the same shell as the subsequent `mvn` invocation. It deliberately
# does NOT use `set -e` to avoid leaking that setting to the parent shell.

# 0) Plugin vendors truststore: import all `plugin-vendors/*.cer` certificates
#    into the `plugin-vendors-default.p12` PKCS12 truststore (certificates only,
#    no private key) bundled into the image. At container startup, it is
#    installed as `<ligoj.home>/plugin-vendors.p12` when this file does not
#    exist yet (see the Dockerfile `INSTALL_PLUGIN_VENDORS` environment, enabled
#    by default), enabling the VERIFIED plugin code-signature status.
#    The store password comes from the `PLUGIN_VENDORS_STOREPASS` Docker build
#    argument, default `changeit` (it only protects public certificates).
#    Escape hatch: a prebuilt `plugin-vendors/plugin-vendors-default.p12`
#    provided in the build context is bundled as-is by the Dockerfile, taking
#    precedence over this generation.
PLUGIN_VENDORS_DIR="${PLUGIN_VENDORS_DIR:-./plugin-vendors}"
PLUGIN_VENDORS_STOREPASS="${PLUGIN_VENDORS_STOREPASS:-changeit}"
if [ -d "$PLUGIN_VENDORS_DIR" ] && ls "$PLUGIN_VENDORS_DIR"/*.cer >/dev/null 2>&1; then
  rm -f plugin-vendors-default.p12
  for cert in "$PLUGIN_VENDORS_DIR"/*.cer; do
    alias="$(basename "${cert%.*}")"
    echo "prepare-build.sh: importing $cert as alias '$alias' into plugin-vendors-default.p12"
    keytool -importcert -noprompt \
            -alias "$alias" \
            -file "$cert" \
            -keystore plugin-vendors-default.p12 \
            -storetype PKCS12 \
            -storepass "$PLUGIN_VENDORS_STOREPASS"
  done
else
  echo "prepare-build.sh: no $PLUGIN_VENDORS_DIR/*.cer certificate; no plugin vendors truststore bundled."
fi

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
