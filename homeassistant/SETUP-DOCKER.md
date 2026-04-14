# Home Assistant Setup With Docker

Last updated: 2026-04-14

This is the preferred team setup path for running `Home Assistant Container` when someone has a Linux host, Linux VM, or `WSL2` environment with a working Docker runtime.

Use this guide when you want:

- a lightweight shared runtime without a full HA OS VM
- the checked-in `Home Assistant` config from this repository
- a setup that matches the current backend bridge assumption more closely than `VirtualBox`
- one repo-local compose entrypoint for `Home Assistant`, `MQTT`, backend, and frontend

Important constraints:

- use `Docker Engine 23+`
- the official Home Assistant docs still describe `Docker Engine` on Linux as the supported install path
- this repository was smoke-tested on `2026-04-14` in `WSL2 + Docker Desktop 29.1.5`, including published ports for `8123`, `5173`, `3000`, and `1883`
- `Home Assistant Container` does not include add-ons, so `MQTT` must run as a separate broker service

## Why This Path Fits The Repo

The current checked-in `Home Assistant` bridge package uses:

- local HTTP `POST /api/media/command`
- retained `MQTT` mirror topics for backend media and health
- direct `REST + WebSocket` reads from the frontend

When `Home Assistant` runs in the same Docker Compose network as the backend, the current default backend URL:

- `http://backend:3000/api/media/command`

can work without extra network translation.

## Recommended Host

Use one of these:

- a Linux machine
- a Linux VM with `Docker Engine`
- `Windows + WSL2 + Docker Desktop` when the team wants one local development stack and published host ports
- a small dedicated Linux box for the team demo

If `Docker Desktop` networking, registry pulls, or host firewall rules become unreliable, switch back to the fallback guide in [SETUP-VIRTUALBOX.md](./SETUP-VIRTUALBOX.md).

## Prepare A Runtime Config Directory

Do not mount the repository `homeassistant/` folder directly as the live HA config directory.

Reason:

- Home Assistant will generate runtime data such as `.storage/`, databases, and caches
- keeping that generated state outside the repo avoids unnecessary git noise

Recommended runtime directory example:

- `~/hajukebox-homeassistant/config`

Copy these tracked files from the repository into that runtime config directory:

- `configuration.yaml`
- `packages/`
- `scripts/`
- `google_assistant.example.yaml`

For this repository, you can prepare that runtime directory automatically with:

```bash
./scripts/sync-homeassistant-config.sh
```

This copies the tracked HA config into:

- `./runtime/homeassistant/config`

## Repository Docker Compose

The repository now contains a top-level [compose.yaml](/home/jiri/projects/school/smart-jukebox/compose.yaml) for:

- `homeassistant`
- `mqtt`
- `backend`
- `frontend`

Recommended first-run workflow:

```bash
cp compose.env.example .env
./scripts/sync-homeassistant-config.sh
docker compose up -d --build
```

Notes:

- the first `Home Assistant` image pull is large and can take several minutes
- on `WSL2 + Docker Desktop`, the stack is reachable locally through `127.0.0.1`
- after the first startup, verify `docker compose ps` shows `hajukebox-homeassistant` as `Up`

After startup, open:

- `http://<docker-host>:8123` for `Home Assistant`
- `http://<docker-host>:5173` for the frontend

## Repository-Specific Checks

Before the first real smoke test, verify these points:

1. Backend URL
   - `packages/jukebox_media_bridge.yaml` currently uses `http://backend:3000/api/media/command`
   - keep it when `Home Assistant` and backend run inside the same Compose network
   - otherwise replace it with a reachable host IP, hostname, or service address

2. MQTT broker
   - `Home Assistant Container` does not provide add-ons
   - the repository compose file already starts a separate `Mosquitto` container on port `1883`

3. Frontend CORS
   - keep `http://127.0.0.1:5173` and `http://localhost:5173` in `http.cors_allowed_origins`
   - if frontend runs from another host or port, extend the list

4. Auth token
   - create one long-lived access token in Home Assistant for the frontend
   - use it with `VITE_HA_TOKEN`

5. Music library
   - there is no linked real music library in the repository by default
   - by default the backend falls back to the bundled mock library
   - to use real music in Docker, point `MUSIC_LIBRARY_PATH` at a host folder and set `MEDIA_LIBRARY_PATH=/music` in `.env`

6. External Wi-Fi devices such as `ESP32`
   - use the LAN IP of the host machine, not Docker service names like `mqtt` or `backend`
   - for `WSL2 + Docker Desktop`, use the Windows host LAN IP, not the internal WSL address
   - keep inbound `TCP 1883` open for the MQTT broker; `8123`, `3000`, and `5173` are useful for cross-device testing too

## Suggested First Smoke

After onboarding:

1. Configure the `MQTT` integration in Home Assistant.
2. Confirm the repo packages and scripts are loaded without config errors.
3. Verify that `GET http://<backend-host>:3000/api/health` is reachable from the HA host.
4. Trigger one HA media script and check that the backend receives the command.
5. Open the frontend with `VITE_HA_BASE_URL` and `VITE_HA_TOKEN` set and confirm the first HA entities load.

## When To Use VirtualBox Instead

Switch back to [SETUP-VIRTUALBOX.md](./SETUP-VIRTUALBOX.md) if:

- the team only has Windows machines without a reliable Linux Docker target
- someone explicitly needs the fuller HA OS experience
- host networking or service discovery becomes too awkward in the Docker environment you have available

## Sources

- Home Assistant Linux and Container install guide:
  https://www.home-assistant.io/installation/linux
- Docker install note in the official guide:
  `Docker Engine` is the officially documented path
