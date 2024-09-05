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
