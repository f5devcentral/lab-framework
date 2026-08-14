FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

FROM --platform=linux/amd64 quay.io/openshift/origin-cli:5.1 AS openshift_cli

FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

ARG KUBECTL_VERSION=v1.33.3
ARG HELM_VERSION=v3.18.4

COPY scripts/install-kubernetes-tools.sh /tmp/install-kubernetes-tools.sh
COPY --from=openshift_cli /usr/bin/oc /usr/local/bin/oc.amd64

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl tar gzip; \
  chmod +x /usr/local/bin/oc.amd64; \
  printf '%s\n' '#!/bin/sh' \
    'if [ "$(uname -m)" = "x86_64" ]; then' \
    '  exec /usr/local/bin/oc.amd64 "$@"' \
    'fi' \
    'echo "OpenShift oc 5.1 is only available for amd64 in this image build." >&2' \
    'exit 1' > /usr/local/bin/oc; \
  chmod +x /usr/local/bin/oc; \
  rm -rf /var/lib/apt/lists/*; \
  chmod +x /tmp/install-kubernetes-tools.sh; \
  KUBECTL_VERSION="$KUBECTL_VERSION" HELM_VERSION="$HELM_VERSION" /tmp/install-kubernetes-tools.sh; \
  rm -f /tmp/install-kubernetes-tools.sh