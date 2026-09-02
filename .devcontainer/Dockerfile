FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

ARG OC_VERSION=4.22.11
ARG TARGETARCH
ARG KUBECTL_VERSION=v1.33.3
ARG HELM_VERSION=v3.18.4

COPY scripts/install-kubernetes-tools.sh /tmp/install-kubernetes-tools.sh

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl tar gzip; \
  case "$TARGETARCH" in \
    amd64) oc_archive="openshift-client-linux-${OC_VERSION}.tar.gz" ;; \
    arm64) oc_archive="openshift-client-linux-arm64-${OC_VERSION}.tar.gz" ;; \
    *) echo "Unsupported OpenShift CLI architecture: $TARGETARCH" >&2; exit 1 ;; \
  esac; \
  curl -fsSL -o /tmp/openshift-client.tar.gz "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/${OC_VERSION}/${oc_archive}"; \
  tar -xzf /tmp/openshift-client.tar.gz -C /usr/local/bin oc; \
  chmod +x /usr/local/bin/oc; \
  rm -f /tmp/openshift-client.tar.gz; \
  rm -rf /var/lib/apt/lists/*; \
  chmod +x /tmp/install-kubernetes-tools.sh; \
  KUBECTL_VERSION="$KUBECTL_VERSION" HELM_VERSION="$HELM_VERSION" /tmp/install-kubernetes-tools.sh; \
  rm -f /tmp/install-kubernetes-tools.sh