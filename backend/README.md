# HAJukeBox Backend

## Purpose

`backend/` is the dedicated local media-service layer for the project.

It is the chosen baseline owner for:

- local MP3 catalog indexing
- media playback state
- media control commands
- frontend-facing media API
- later Spotify auth and session handling

It is **not** the owner of automation truth, room state, or sensor fusion.
`Home Assistant` keeps that role.

## Current Decision

The architecture is frozen to:

- `Home Assistant` as the central automation runtime
- `backend/` as the explicit media-state subsystem
- `frontend/` consuming both domains through separate adapters

`Music Assistant` is not part of the baseline plan.

If it was installed during experiments, do not model new code or docs around it.

## Assignment Compatibility

The school brief says the system must remain centrally controlled by `Home Assistant` without depending on an external cloud service or hidden off-platform runtime.

For this project, that means:

- the backend is a local project service running beside HA
- HA still owns automation, entity state, and integration visibility
- the backend owns media only
- the frontend must not infer room or automation truth from backend-only data
- essential media summaries and commands must be mirrored into `Home Assistant` for the demo path

## Backend Responsibilities

### Required for baseline

- scan and expose the local MP3 catalog
- expose current media state in a frontend-friendly shape
- accept media commands such as `play`, `pause`, `next`, `previous`, `seek`, and `set_volume`
- keep a stable player identifier that `Home Assistant` can target
- mirror media state into `Home Assistant`
- expose health and recent log information
- fail gracefully when the local media library is missing or empty

### Optional later

- Spotify authorization helper
- Spotify token refresh handling
- Spotify session and device mirror for UI and HA visibility
- source switching between local media and Spotify

## What The Backend Must Not Own

- presence confidence as the final truth
- mode automations such as `focus`, `party`, or `eco`
- ESP32 sensor fusion decisions
- direct hardware orchestration for LEDs, ultrasonic, or clap sensing
- any assumption that Spotify raw audio can be sent to ESP32 through the normal Web API

## Recommended Architecture

### Baseline engine

Implement a custom local media service for:

- filesystem scan
- metadata extraction
- cover-art resolution
- normalized playback state
- command handling

Keep the media contract stable from the start so the frontend does not care about internal implementation details.

### Bridge to Home Assistant

The backend should provide enough mirrored state for `Home Assistant` to remain the visible automation brain.

Minimum bridge outputs:

- current track metadata
- playback status
- progress and duration
- active source label
- volume
- recent media event entries
- backend health

The backend should also accept commands originating from `Home Assistant` for:

- play/pause
- next/previous
- seek
- volume
- source selection later

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

- `WebSocket`
- `Server-Sent Events`
- polling first, then realtime later

The contract matters more than the first transport choice.

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

## Definition Of Done

### Baseline done

- local MP3 library is discoverable
- local MP3 playback can be controlled programmatically
- frontend can read true media state from the backend contract
- Home Assistant can trigger the same playback commands
- the backend can survive empty-library and disconnected-player cases

### Bonus done

- Spotify PKCE flow works
- Spotify token refresh is stable
- frontend receives true Spotify state
- Home Assistant can see Spotify source state without becoming dependent on browser-only internals

## Risks

- do not let the backend become a second automation brain beside `Home Assistant`
- do not invent backend-only room logic that bypasses HA
- keep Spotify secrets server-side only
- keep local MP3 as the required path even if Spotify stalls

## Sources

- Spotify authorization concepts: https://developer.spotify.com/documentation/web-api/concepts/authorization
- Spotify Web Playback SDK: https://developer.spotify.com/documentation/web-playback-sdk
- Home Assistant REST API: https://developers.home-assistant.io/docs/api/rest
- Home Assistant WebSocket API: https://developers.home-assistant.io/docs/api/websocket/
- Project master plan: ../docs/idea/master-plan.md
