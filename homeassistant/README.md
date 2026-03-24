# HAJukeBox Home Assistant

## Purpose

`homeassistant/` contains the central automation runtime plan for the project.

`Home Assistant` is the system source of truth for:

- room state
- automation state
- mode state
- normalized sensor/device health

It is also the main integration point between:

- frontend
- backend/media service
- MQTT broker
- ESP32

## Current Decision

Baseline project success is:

- `Local MP3 + Home Assistant + MQTT + ESP32 + frontend`

Bonus work is:

- `Spotify Web Playback SDK`
- `Google Assistant`

That means Home Assistant should be configured for the baseline local MP3 path first.

## Home Assistant Responsibilities

### Required for baseline

- ingest MQTT sensor/device data from ESP32
- normalize state into entities the frontend and automations can rely on
- expose state through REST and WebSocket APIs
- run scripts and automations for the local MP3 path
- keep mode logic such as `focus`, `party`, `eco`, and presence-related decisions
- log meaningful automation events

### Optional later

- expose selected entities to Assist or Google Assistant
- mirror Spotify source state
- trigger Spotify-related scripts once the browser player path exists

## Required Integrations

Recommended baseline integrations:

- `MQTT`
- `Music Assistant` if adopted as the playback engine
- default `Recorder` and `Logbook` support for debugging

Recommended optional integrations later:

- `Assist`
- Google exposure path

## Recommended Entity Set

Use stable names early so frontend, backend, and HA automations do not drift.

### Media

- `media_player.hajukebox_main`
- `sensor.hajukebox_media_source`

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
- `sensor.hajukebox_backend_status`

Append-only logs should not be modeled as dozens of Home Assistant sensors.
Use MQTT or backend event streams for the raw feed and mirror only summary state into HA when needed.

## Scripts And Automations

### Baseline scripts

- `script.hajukebox_play`
- `script.hajukebox_pause`
- `script.hajukebox_next`
- `script.hajukebox_previous`
- `script.hajukebox_set_volume`
- `script.hajukebox_set_mode`

### Baseline automations

- presence update from MQTT/device state
- focus-mode activation from proximity rules
- eco shutdown when presence is truly gone
- event logging for every visible automation action
- backend or player disconnect detection

### Optional later

- clap shortcut to mode switching
- Spotify source switch automation
- Assist or Google-triggered scripts

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

The frontend should mainly read Home Assistant through:

- `WebSocket API` for live updates
- `REST API` for initial fetches or fallback calls

This keeps Home Assistant visible as the runtime brain instead of hiding all truth behind a custom backend.

## Suggested Folder Layout

```text
homeassistant/
  README.md
  TODO.md
  configuration.yaml
  packages/
    jukebox_helpers.yaml
    jukebox_mqtt.yaml
    jukebox_entities.yaml
  automations/
    jukebox_presence.yaml
    jukebox_media.yaml
    jukebox_logging.yaml
  scripts/
    jukebox_commands.yaml
```

## Definition of Done

### Baseline done

- MQTT sensor topics arrive in Home Assistant
- stable HA entities exist for the frontend adapter
- local MP3 commands can be issued from HA scripts
- at least one visible presence automation works end-to-end
- log entries exist for real automation events

### Bonus done

- selected entities are safely exposed to voice control
- Spotify source state is visible in HA
- voice or assistant commands can trigger HAJukeBox scripts without breaking the local MP3 baseline

## Risks

- do not split automation truth between backend and Home Assistant
- do not model append-only logs as many separate entities
- do not block baseline progress on Spotify or Google
- freeze entity names early or the frontend adapter will churn

## Sources

- Home Assistant REST API: https://developers.home-assistant.io/docs/api/rest
- Home Assistant WebSocket API: https://developers.home-assistant.io/docs/api/websocket/
- Music Assistant integration: https://www.music-assistant.io/integration/
- Music Assistant installation notes: https://www.music-assistant.io/integration/installation/
- Project frontend master plan: ../frontend/sketch/docs/idea/master-plan.md
