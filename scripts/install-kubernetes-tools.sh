#!/bin/sh

set -eu

KUBECTL_VERSION="${KUBECTL_VERSION:-v1.33.3}"
HELM_VERSION="${HELM_VERSION:-v3.18.4}"

case "$(uname -m)" in
    x86_64)
        bin_arch="amd64"
        ;;
    aarch64|arm64)
        bin_arch="arm64"
        ;;
    *)
        echo "Unsupported architecture: $(uname -m)" >&2
        exit 1
        ;;
esac

curl -fsSL -o /usr/local/bin/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${bin_arch}/kubectl"
chmod +x /usr/local/bin/kubectl

curl -fsSL -o /tmp/helm.tar.gz "https://get.helm.sh/helm-${HELM_VERSION}-linux-${bin_arch}.tar.gz"
tar -xzf /tmp/helm.tar.gz -C /tmp
mv "/tmp/linux-${bin_arch}/helm" /usr/local/bin/helm
chmod +x /usr/local/bin/helm
rm -rf /tmp/helm.tar.gz "/tmp/linux-${bin_arch}"