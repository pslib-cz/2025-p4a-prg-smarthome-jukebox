# HAJukeBox Backend

## Purpose

`backend/` is the integration and media-service layer for the project.

It exists to support:

- local MP3 library and playback
- normalized media state for the frontend
- Home Assistant integration glue
- optional Spotify auth/session support later

It must **not** become the primary source of truth for room state, presence logic, or automation logic.
`Home Assistant` keeps that role.

## Current Decision

Baseline project success is:

- `Local MP3 + Home Assistant + MQTT + ESP32 + frontend`

Bonus work is:

- `Spotify Web Playback SDK`
- `Google Assistant`

Because of that, the backend must be designed around the local MP3 path first.

## Backend Responsibilities

### Required for baseline

- scan and expose the local MP3 catalog
- expose current media state in a frontend-friendly shape
- accept media commands such as `play`, `pause`, `next`, `previous`, `seek`, and `set_volume`
- keep a stable player identifier that Home Assistant can target
- publish or mirror media state to Home Assistant
- expose health and recent log information
- fail gracefully when the local media library is missing or empty

### Optional later

- Spotify authorization helper
- Spotify token refresh handling
- Spotify session/device mirror for UI and HA visibility
- source switching between local media and Spotify

## What The Backend Should Not Own

- presence confidence as the final truth
- mode automations such as `focus`, `party`, or `eco`
- ESP32 sensor fusion decisions
- direct hardware orchestration for LEDs, ultrasonic, or clap sensing
- any assumption that Spotify raw audio can be sent to ESP32 through the normal Web API

## Recommended Architecture

### Preferred baseline

Use `Music Assistant Server` as the actual media engine if it satisfies:

- local library indexing
- local playback
- queue/player control
- Home Assistant integration

Then keep this backend as a thin glue layer for:

- frontend-friendly API shape
- state normalization
- event/log shaping
- optional Spotify auth/session handling

### Fallback baseline

If `Music Assistant` does not cover the required local MP3 demo path cleanly enough, build a small custom backend service for:

- local library scan
- local playback control
- normalized state export
- HA bridge

If this fallback is chosen, keep the API contract below unchanged so the frontend does not care which engine is underneath.

## API Contract

Recommended baseline endpoints:

- `GET /api/health`
- `GET /api/media/state`
- `POST /api/media/command`
- `GET /api/library/tracks`
- `GET /api/library/playlists`
- `GET /api/logs/recent`

Recommended command payload shape:

```json
{
  "type": "play"
}
```

```json
{
  "type": "set_volume",
  "volumePercent": 72
}
```

Recommended state domains returned to the frontend:

- `media`
- `library`
- `systemHealth`
- `eventLog`
- `spotify` later

## Realtime Contract

Recommended baseline event names:

- `media.state.updated`
- `library.updated`
- `system.health.updated`
- `log.entry.created`

These events can be implemented using:

- WebSocket
- Server-Sent Events
- polling first, then realtime later

The contract matters more than the first transport choice.

## Home Assistant Bridge

The backend should expose or mirror enough data for Home Assistant to become the visible automation brain.

Minimum bridge outputs:

- current track metadata
- playback status
- progress and duration
- active source label
- volume
- recent media event entries
- backend health

The backend should also accept commands originating from Home Assistant for:

- play/pause
- next/previous
- seek
- volume
- source selection later

## Suggested Folder Layout

```text
backend/
  README.md
  TODO.md
  src/
    app/
    config/
    media/
    spotify/
    homeassistant/
    transport/
    logs/
  tests/
```

## Definition of Done

### Baseline done

- local MP3 library is discoverable
- local MP3 playback can be controlled programmatically
- frontend can read true media state from the backend contract
- Home Assistant can trigger the same playback commands
- the backend can survive empty library and disconnected-player cases

### Bonus done

- Spotify PKCE flow works
- Spotify token refresh is stable
- frontend receives true Spotify state
- Home Assistant can see Spotify source state without becoming dependent on browser-only internals

## Risks

- do not duplicate `Music Assistant` features without a concrete reason
- do not let the backend become a second automation brain beside Home Assistant
- keep Spotify secrets server-side only
- keep local MP3 as the required path even if Spotify stalls

## Sources

- Music Assistant integration: https://www.music-assistant.io/integration/
- Music Assistant API: https://www.music-assistant.io/api/
- Spotify authorization concepts: https://developer.spotify.com/documentation/web-api/concepts/authorization
- Spotify Web Playback SDK: https://developer.spotify.com/documentation/web-playback-sdk
- Project frontend master plan: ../frontend/sketch/docs/idea/master-plan.md
