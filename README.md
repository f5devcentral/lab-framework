# Lab Framework

A portable and extensible framework for interactive labs

## Design Objectives

- Framework can load local or remote content
- Entire application will run in a container
- Application will require permissions to connect to Docker on the host machine (Docker Beside Docker pattern)
- Future: Will feature ability to share progress information centrally for a "scoreboard"

## Technical

- Primary Application will be written in TypeScript on NextJS
- Unit tests will be written per component and per library
- Development experience will be VSCode with Devcontainers
- External APIs will be mocked with MockServer, running in a container
- Production application will be distributed as a container
- All API calls should be cached in the NextJS framework
- Client-side application state will ideally be handled by native React/NextJS facilities such as Contexts and Reducers

## Development

The lab framework requires third-party containers. As a result, this project utilizes [devcontainers](https://code.visualstudio.com/docs/devcontainers/containers) to enable real-time development without having to incur setup complexity.

Ensure you have the following prerequisites installed:

1. **Visual Studio Code:** Download and install the latest version of VSCode from the [official website](https://code.visualstudio.com/).
1. **Docker:** Install Docker on your machine. You can find the installation instructions for your operating system on the [Docker website](https://docs.docker.com/get-docker/).
1. **Visual Studio Code Extensions:** Install the **Dev Containers** extension in VSCode.

Once the prerequisites are installed, perform the following:

1. In the vscode command palette, select `Dev Containers: Rebuild Container`

1. Open a new bash terminal in vscode.

1. Next, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the lab markdown page by modifying `app/docs/nginx-one.mdx`. The page auto-updates as you edit the file.

An optional Kubernetes peer cluster profile is available in the devcontainer Compose stack:

```shell
# Rebuild devcontainer with default services (no optional k3s profile)
Dev Containers: Rebuild Container

# Rebuild devcontainer with optional k3s peer cluster
COMPOSE_PROFILES=k3s Dev Containers: Rebuild Container
```

For OpenShift access in devcontainer mode, provide `./openshift/kubeconfig.yaml` in the repository workspace and set:

1. `KUBECONFIG=/home/node/.kube-openshift/kubeconfig.yaml`
1. `KUBERNETES_API_URL=https://api.your-openshift.example:6443`

## "Production" Docker Deployment

The lab framework runs in Docker, so Docker must be installed in the host system. The framework container will use the host's Docker API to manage containers, and the deployment may also include a peer single-node K3s cluster container that the framework can use for Kubernetes and Helm workflows.

The host system needs to expose the Docker API over a network so that the lab framework container can connect to it. This approach involves some setup and is more secure when properly configured, especially when using TLS for encrypted communication.

Assuming a host system of Ubuntu 24.04, docker can be installed using the following:

```shell
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Once installed, you can configure Docker to expose its API over the network (if needed):

```shell
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "hosts": ["tcp://0.0.0.0:2375", "unix:///var/run/docker.sock"]
}
EOF

sudo mkdir /etc/systemd/system/docker.service.d/

sudo tee /etc/systemd/system/docker.service.d/override.conf > /dev/null <<'EOF'
# Disable flags to dockerd, all settings are done in /etc/docker/daemon.json
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
EOF

sudo systemctl daemon-reload; sudo systemctl restart docker

# Open up permissions to host docker socket so container can interact with it
sudo chmod 0666 /var/run/docker.sock

```

The lab framework deployment uses Compose to orchestrate the application container, MockServer, and any peer infrastructure containers such as the K3s cluster.

The K3s service is optional and is controlled by the `k3s` Compose profile:

```shell
# Start the framework stack without K3s
docker compose up -d

# Start the framework stack with the optional K3s peer cluster
docker compose --profile k3s up -d

# Stop the framework stack started without K3s
docker compose down

# Stop the framework stack started with the optional K3s peer cluster
docker compose --profile k3s down

# Optional: remove volumes for a full reset
docker compose --profile k3s down -v
```

OpenShift access is also available for connecting the framework to an external OpenShift cluster using a kubeconfig file:

```shell
# Prepare an OpenShift kubeconfig at this path:
# ./openshift/kubeconfig.yaml

# Point the app at the OpenShift kubeconfig and API endpoint
export KUBECONFIG=/app/.kube-openshift/kubeconfig.yaml
export KUBERNETES_API_URL=https://api.your-openshift.example:6443

# Start the framework stack
docker compose up -d
```

In order for the lab framework to create additional containers required by the lab author, the docker calls need to use the host's docker daemon. The above steps enable mounting docker.sock as a volume into the container.

If this isn't preferred (or will not work), the host's docker daemon has been configured to allow remote hosts to call the docker API. To use this, you will specify a custom host via the `-H` parameter in order to connect to the hosts Docker API. Example:

```shell
docker -H tcp://host.docker.internal:2375 pull ubuntu
```

### Kubernetes Peer Cluster

When the `k3s` profile is enabled, the deployment starts a single-node K3s cluster as a peer container in the same Compose network. The lab framework can connect to the cluster through the Kubernetes API, and host tools such as `kubectl` and `helm` may connect directly when port `6443` is published to the host.

The intended operating model is trusted local-lab administration:

1. The framework may use full cluster-admin privileges.
1. Namespace scoping is not required.
1. Kubeconfig and cluster credentials do not need to rotate on stack redeploy.
1. Cluster certificates should be issued with a multi-year validity window.
1. The K3s container may mount the host `docker.sock` if a lab workflow needs Docker-backed cluster integration.

The framework and the K3s container should share a kubeconfig or equivalent access path so that Kubernetes operations, resource provisioning, and Helm chart installs can be driven from the application runtime.

### OpenShift Option

The framework image includes the OpenShift `oc` client pinned to v5.1. Compose mounts `./openshift` into the framework container at `/app/.kube-openshift` (and `/home/node/.kube-openshift` in devcontainer mode), so OpenShift access uses your provided kubeconfig directly.

Use the following environment variables to point the framework at OpenShift:

1. `KUBECONFIG=/app/.kube-openshift/kubeconfig.yaml`
1. `KUBERNETES_API_URL=https://api.your-openshift.example:6443`

### Environment

You will need to create your own `/.env` file to use remote MDX documents. Use the `/.env.example` as a template.
