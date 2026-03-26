# HAJukeBox Home Assistant

## Purpose

`homeassistant/` contains the central automation runtime plan for the project.

Quick team setup guide:

- VirtualBox setup on Windows: [SETUP-VIRTUALBOX.md](./SETUP-VIRTUALBOX.md)

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

### Optional later

- expose selected entities to `Assist` or `Google Assistant`
- mirror Spotify source state
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

Append-only logs should not be modeled as many separate Home Assistant sensors.
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

- presence update from MQTT and device state
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
- Spotify session state later

This keeps `Home Assistant` visible as the runtime brain while still allowing the backend to own the media domain explicitly.

If the assignment is interpreted strictly during grading, `Home Assistant` must still expose enough mirrored media state and scripts so the system can be defended as HA-centered.

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
- Home Assistant Windows install: https://www.home-assistant.io/installation/windows/
- Home Assistant Ping integration: https://www.home-assistant.io/integrations/ping/
- Project master plan: ../docs/idea/master-plan.md
