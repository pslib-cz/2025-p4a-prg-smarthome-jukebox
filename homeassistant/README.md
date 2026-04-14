# HAJukeBox Home Assistant

## Purpose

`homeassistant/` contains the central automation runtime plan for the project.

Quick team setup guide:

- Preferred Docker setup: [SETUP-DOCKER.md](./SETUP-DOCKER.md)
- Alternative VirtualBox setup: [SETUP-VIRTUALBOX.md](./SETUP-VIRTUALBOX.md)

`Home Assistant` is the system source of truth for:

- room state
- automation state
- mode state
- normalized sensor and device health

It is also the main integration point between:

- frontend
- backend media service
- MQTT broker
- ESP32

## Current Decision

Baseline project success is:

- `Local MP3 + Home Assistant + MQTT + ESP32 + frontend`

Bonus work is:

- `Spotify Web Playback SDK`
- `Google Assistant`

The chosen architecture uses a custom local backend for media state and playback.
`Home Assistant` still remains the visible automation brain.

Preferred current team runtime path:

- `Home Assistant Container` in the repository `Docker Compose` stack on a Linux host, Linux VM, or `WSL2 + Docker Desktop`
- `Home Assistant OS` on `VirtualBox` only as a fallback path when Docker is not practical or when someone needs the fuller HA OS environment

`Music Assistant` is not part of the selected baseline. If it was installed for testing, it can be removed.

## Assignment Compliance For 3 People

For `N = 3`, the school brief requires at least:

- `2` local HA integrations
- `3` scenarios
- `6` entities

Recommended compliance baseline:

- local integrations:
  - `MQTT`
  - one additional local integration, recommended `Ping`
- scenarios:
  - `Focus`
  - `Party`
  - `Eco / Presence`
- entities:
  - distance
  - clap count
  - RSSI
  - uptime
  - mode
  - media source or media state

Do not count the custom backend as one of the required HA integrations.

## Home Assistant Responsibilities

### Required for baseline

- ingest `MQTT` sensor and device data from `ESP32`
- normalize state into entities the frontend and automations can rely on
- expose state through `REST` and `WebSocket` APIs
- run scripts and automations for the local MP3 path
- keep mode logic such as `focus`, `party`, `eco`, and presence-related decisions
- log meaningful automation events
- mirror backend media summaries into HA entities or scripts

## Implemented Bridge Scaffold

The baseline bridge scaffold now lives in:

- `configuration.yaml`
- `packages/jukebox_media_bridge.yaml`
- `packages/jukebox_google_assistant.yaml`
- `scripts/jukebox_media.yaml`
- `google_assistant.example.yaml`

Current bridge split:

- `Home Assistant -> backend`: local HTTP `POST /api/media/command`
- `backend -> Home Assistant`: MQTT mirror topics
- `frontend -> Home Assistant`: direct `REST + WebSocket` telemetry reads

Current checked-in repo assumption:

- `packages/jukebox_media_bridge.yaml` currently points to `http://backend:3000/api/media/command`
- that works as-is when `Home Assistant` runs inside the same Docker Compose network as the backend
- for `VirtualBox`, host-native, or remote deployments, replace that URL with a reachable backend host address before testing HA scripts

Current mirrored MQTT topics:

- `jukebox/media/state`
- `jukebox/system/health`
- `jukebox/system/event`

The media-state mirror now also carries a nested `spotify` summary block so HA can expose:

- Spotify auth status
- Spotify account tier
- Spotify device name
- Spotify transfer status
- Spotify last error
- Spotify authenticated / active-device binary sensors

Backend runtime env for the MQTT mirror:

- `HAJUKEBOX_MQTT_BROKER_URL`
- `HAJUKEBOX_MQTT_USERNAME`
- `HAJUKEBOX_MQTT_PASSWORD`
- `HAJUKEBOX_MQTT_CLIENT_ID`
- `HAJUKEBOX_MQTT_TOPIC_PREFIX`

State and health topics should stay retained. Event topics should stay non-retained.

Runtime note for Docker:

- `Home Assistant Container` does not provide add-ons
- the project therefore needs a separate `MQTT` broker container or another reachable broker service
- the checked-in HA config is still compatible with this model because it depends on YAML packages, `REST`, `WebSocket`, and the standard `MQTT` integration

### Optional later

- link a real `Google Assistant` / Google Home project to the exposed HA request entities
- trigger Spotify-related scripts once the browser player path exists

## Required Integrations

Recommended baseline integrations:

- `MQTT`
- `Recorder`
- `Logbook`
- one additional local integration for assignment compliance, recommended `Ping`

Recommended optional integrations later:

- `ESPHome` if the final firmware path uses it
- `Local Tuya` if the team adds a local smart plug or other local Tuya device
- `Assist`
- Google exposure path

## Recommended Entity Set

Use stable names early so frontend, backend, and HA automations do not drift.

### Media

- `media_player.hajukebox_main`
- `sensor.hajukebox_media_source`
- `sensor.hajukebox_backend_status`

### Sensor and presence state

- `sensor.hajukebox_distance_cm`
- `sensor.hajukebox_presence_confidence`
- `sensor.hajukebox_presence_reason`
- `sensor.hajukebox_clap_count_today`

### Device and broker health

- `sensor.hajukebox_esp32_rssi`
- `sensor.hajukebox_broker_latency_ms`
- `sensor.hajukebox_uptime`
- `binary_sensor.hajukebox_mqtt_connected`

### Mode and control helpers

- `input_select.hajukebox_mode`
- `input_boolean.hajukebox_presence_enabled`

### Optional summary mirrors

- `sensor.hajukebox_last_event`
- `sensor.hajukebox_spotify_auth_status`
- `sensor.hajukebox_spotify_account_tier`
- `sensor.hajukebox_spotify_device`
- `sensor.hajukebox_spotify_transfer_status`
- `sensor.hajukebox_spotify_last_error`
- `binary_sensor.hajukebox_spotify_authenticated`
- `binary_sensor.hajukebox_spotify_active_device`
- `input_text.hajukebox_last_voice_source`
- `input_text.hajukebox_last_voice_command`
- `input_text.hajukebox_last_voice_response`

Append-only logs should not be modeled as many separate Home Assistant sensors.
Use MQTT or backend event streams for the raw feed and mirror only summary state into HA when needed.

## Scripts And Automations

### Baseline scripts

Currently implemented in `scripts/jukebox_media.yaml`:

- `script.hajukebox_play`
- `script.hajukebox_pause`
- `script.hajukebox_next`
- `script.hajukebox_previous`
- `script.hajukebox_seek`
- `script.hajukebox_set_volume`

Still planned for the baseline:

- `script.hajukebox_set_mode`

### Baseline automations

- presence update from MQTT and device state
- focus-mode activation from proximity rules
- eco shutdown when presence is truly gone
- event logging for every visible automation action
- backend or player disconnect detection

### Optional later

- clap shortcut to mode switching
- Spotify source switch automation
- Assist or Google-triggered scripts

## Google Assistant Trigger Path

The repository now includes a first real `Google Assistant`-ready slice:

- dedicated `input_button` request entities meant to be exposed through the official HA `Google Assistant` integration
- HA automations that translate those requests into the existing `HAJukeBox` media scripts
- HA helper entities that store the latest voice source, command, and response for dashboards and the frontend

Implemented files:

- `packages/jukebox_google_assistant.yaml`
- `google_assistant.example.yaml`

Request entities prepared for exposure:

- `input_button.hajukebox_google_play_request`
- `input_button.hajukebox_google_pause_request`
- `input_button.hajukebox_google_next_request`
- `input_button.hajukebox_google_previous_request`

Voice feedback helpers:

- `input_text.hajukebox_last_voice_source`
- `input_text.hajukebox_last_voice_command`
- `input_text.hajukebox_last_voice_response`

The example config intentionally stays outside the live `configuration.yaml` load path because real Google setup still needs:

- external HA access with SSL
- a Google Home Developer Console project
- a real `SERVICE_ACCOUNT.json`

Do not use the old `Dialogflow -> Google Assistant` path for this project.

## MQTT Contract

Recommended topic namespace:

- `jukebox/sensors/distance`
- `jukebox/sensors/clap`
- `jukebox/sensors/mic_level`
- `jukebox/device/rssi`
- `jukebox/device/uptime`
- `jukebox/device/health`
- `jukebox/media/state`
- `jukebox/media/command`
- `jukebox/system/event`
- `jukebox/system/health`

Recommended rule:

- keep payloads JSON-based
- include `timestamp`
- include `source`

## Frontend Access

The frontend should mainly read `Home Assistant` for:

- telemetry
- presence
- automation state
- mode state
- health state

The frontend should read the custom backend for:

- local library
- active media state
- media commands
- Spotify session and playback state

This keeps `Home Assistant` visible as the runtime brain while still allowing the backend to own the media domain explicitly.

If the assignment is interpreted strictly during grading, `Home Assistant` must still expose enough mirrored media state and scripts so the system can be defended as HA-centered.

For local browser development, allow the Vite origin in `http.cors_allowed_origins`, for example:

- `http://127.0.0.1:5173`
- `http://localhost:5173`

## Suggested Folder Layout

```text
homeassistant/
  README.md
  TODO.md
  SETUP-DOCKER.md
  SETUP-VIRTUALBOX.md
  configuration.yaml
  google_assistant.example.yaml
  packages/
    jukebox_frontend_telemetry.yaml
    jukebox_media_bridge.yaml
    jukebox_google_assistant.yaml
  scripts/
    jukebox_media.yaml
```
## Definition Of Done

### Baseline done

- MQTT sensor topics arrive in `Home Assistant`
- stable HA entities exist for the frontend adapter
- local MP3 commands can be issued from HA scripts into the backend bridge
- at least one visible presence automation works end to end
- log entries exist for real automation events

### Bonus done

- selected entities are safely exposed to voice control
- Spotify source state is visible in HA
- voice or assistant commands can trigger HAJukeBox scripts without breaking the local MP3 baseline

## Risks

- do not split automation truth between backend and `Home Assistant`
- do not model append-only logs as many separate entities
- do not block baseline progress on Spotify or Google
- freeze entity names early or the frontend adapter will churn

## Sources

- Home Assistant REST API: https://developers.home-assistant.io/docs/api/rest
- Home Assistant WebSocket API: https://developers.home-assistant.io/docs/api/websocket/
- Home Assistant Linux and Container install guide: https://www.home-assistant.io/installation/linux
- Home Assistant Windows install: https://www.home-assistant.io/installation/windows/
- Home Assistant Ping integration: https://www.home-assistant.io/integrations/ping/
- Home Assistant Google Assistant integration: https://www.home-assistant.io/integrations/google_assistant/
- Home Assistant Dialogflow note: https://www.home-assistant.io/integrations/dialogflow/
- Project master plan: ../docs/idea/master-plan.md
