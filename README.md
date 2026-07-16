# lab-framework

A portable and extensible framework for interactive labs

## Design Objectives

- Framework can load local or remote content
- Entire application will run in a container
- Application will require permissions to connect to Docker on the host machine (Docker Beside Docker pattern)
- Will feature ability to share progress information centrally for a "scoreboard"

## Technical Assumptions

- Primary Application will be written in TypeScript on NextJS
- Unit tests will be written per component and per library
- Development experience will be VSCode with Devcontainers
- External APIs will be mocked with MockServer, running in a container
- Production application will be distributed as a container
- Backend data store will be *TBD* if needed
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

## "Production" Docker Deployment

The lab framework runs in Docker, so the it must be installed in the host system. Additionally, the lab framework container will use the host's docker API to manage containers. The host system needs to expose the Docker API over a network so that the lab framework container can connect to it. This approach involves some setup and is more secure when properly configured, especially when using TLS for encrypted communication.

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

A `docker-compose.yaml` file has been provided to orchestrate the lab framework containers. In order for the lab framework to create additional containers required by the lab author, the docker calls need to use the host's docker daemon. The above steps enable mounting docker.sock as a volume into the container.

If this isn't preferred (or will not work), the host's docker daemon has been configured to allow remote hosts to call the docker API. To use this, you will specify a custom host via the `-H` parameter in order to connect to the hosts Docker API. Example:

```shell
docker -H tcp://host.docker.internal:2375 pull ubuntu
```

### Environment

You will need to create your own `/.env` file to use remote MDX documents. Use the `/.env.example` as a template.
