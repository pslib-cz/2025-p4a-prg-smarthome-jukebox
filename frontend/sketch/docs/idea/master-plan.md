# HAJukeBox Master Plan

Last updated: 2026-03-19
Status: Draft v1

## Context Note
- This plan was built from the current repository, recent frontend state, and technical decisions discussed in chat.
- `docs/idea/idea-1.md`, `docs/idea/idea-2.md`, and `docs/assignment/assignment.md` were empty at the time of writing.
- Final alignment against the original Notion notes and the exact school brief is still pending.

## Executive Summary
HAJukeBox should be built as a multi-layer local smart jukebox system with a strong visual frontend, a local application server, Home Assistant for automation and device orchestration, and one or more ESP32 nodes for physical sensing and actuator control.

The project should support two media paths:
- `Local MP3 path`: fully owned playback path that we control end to end
- `Spotify path`: browser playback through Spotify Web Playback SDK, with metadata, state, and control exposed into the same HAJukeBox UI and automation model

The recommended architecture is:
- `Frontend`: visual UI, user controls, browser-side Spotify player host, live telemetry presentation
- `Local server`: media orchestration, auth/session hub, local library, real-time state API, event log aggregation
- `Home Assistant`: automations, entity state, Google Assistant path, MQTT broker integration, room/device logic
- `ESP32`: raw sensor acquisition and hardware actuation, not business-logic orchestration

## Project Goals
1. Deliver a music-first interface that still proves monitoring, automation, and logging quality.
2. Keep local MP3 playback as the reliable baseline path.
3. Add Spotify through the officially supported browser playback path.
4. Integrate room presence and interaction sensors through ESP32 and MQTT.
5. Make Google Assistant a trigger path into the system, not the central application runtime.
6. Keep the whole system understandable enough for a 3-person team.

## Non-Negotiable Decisions
1. Spotify audio will not be streamed as raw MP3 or PCM into ESP32 through the standard Web API.
2. The frontend is not the long-term source of truth for automation or device state.
3. Home Assistant should own home/device automation state.
4. The local server should own media state and session coordination.
5. ESP32 should publish sensor data and execute commands, but not decide system behavior on its own.
6. MQTT should be the shared event bus between ESP32, Home Assistant, and the local server.

## System Ownership

| Layer | Owns | Does Not Own |
| --- | --- | --- |
| Frontend | UI state, browser interactions, Web Playback SDK host, telemetry rendering | Secrets, automation truth, raw sensor acquisition |
| Local server | Local media catalog, Spotify auth/session handling, media commands, aggregated logs, realtime API | Raw hardware control, long-running room automation rules |
| Home Assistant | Entity states, automations, Google Assistant entry path, MQTT integrations, device scripts | Spotify audio playback, frontend UI state |
| ESP32 | Sensors, actuator I/O, local health reporting, clap/proximity capture | High-level orchestration, cloud auth, multi-source media routing |

## Recommended Architecture

### Frontend
Recommended role:
- React/Vite/TypeScript client
- Visual sketch, now evolving into the real control surface
- Browser host for Spotify Web Playback SDK
- Receives live updates from the local server through WebSocket or SSE
- Sends user commands to the local server

Recommended rules:
- Treat frontend state as presentational cache, not business truth
- Never store Spotify client secret here
- Never make browser-only state the only copy of important system events

### Local Server
Recommended role:
- Main application backend
- Local MP3 scanning, indexing, artwork resolution, playlists, playback orchestration
- Spotify OAuth flow, token refresh, device/session coordination
- Real-time state fanout to the frontend
- Logging aggregation from frontend, HA, and ESP events

Recommended stack:
- Node.js + TypeScript
- Fastify or Express
- WebSocket or SSE for live updates
- SQLite or lightweight local DB for media index and event logs

Why this is the best fit:
- Same language as frontend
- Good fit for Spotify APIs and real-time frontend state
- Easier team sharing than a fragmented backend stack

### Home Assistant
Recommended role:
- Home/device brain
- MQTT entity ingestion
- Automation engine for proximity, clap, mode activation, room exit, LED reactions
- Google Assistant / Google Home integration path
- Optional dashboards for debugging only, not the main product UI

Recommended rules:
- HA should consume sensor topics and expose clear entities
- HA should run device automations and scene-like behaviors
- HA should call the local server for media commands instead of trying to own Spotify logic directly

### ESP32
Recommended role:
- Ultrasonic distance sensing
- Clap or sound impulse detection
- Microphone level sampling if needed
- Speaker/amplifier output only if the final hardware path remains stable enough
- Device telemetry: RSSI, uptime, health pulse

Recommended warning:
- One ESP32 doing speaker output, microphone sampling, ultrasonic ranging, MQTT, and other logic may become unstable
- If this gets unreliable, split into:
  - `ESP32-sensor node`
  - `ESP32-audio node`

## Media Strategy

### Local MP3 Path
This should be the primary reliable demo path.

Flow:
1. Frontend requests local library from the local server.
2. User selects a local track.
3. Local server resolves file, metadata, cover art, and playback target.
4. Playback state is published to frontend and optionally mirrored into HA.
5. ESP32 or HA reacts only as a secondary automation/telemetry channel.

Why this path matters:
- Full control over files and metadata
- No premium-account dependency
- Easier fallback if Spotify or network paths fail

### Spotify Path
Spotify should use Web Playback SDK in the browser.

Flow:
1. User authenticates Spotify.
2. Local server stores/refreshes Spotify tokens.
3. Frontend receives a short-lived token and boots the Web Playback SDK.
4. Browser becomes a Spotify Connect device.
5. Playback is transferred to that browser device.
6. Playback state is mirrored into frontend UI, local server state, and telemetry/logging.

Important technical facts:
- Spotify Web API mainly returns metadata and control responses, not raw audio files
- Web Playback SDK requires Spotify Premium
- The browser must be alive and registered as the playback device
- The ESP32 should not be expected to decode Spotify audio from the normal Web API

## Voice and Google Assistant Strategy

### Recommended Path
Treat Google Assistant as a trigger into Home Assistant, not as a custom conversation platform we build from scratch.

Recommended flow:
1. User speaks to a Google Assistant / Google Home device or app.
2. Google Assistant triggers a Home Assistant exposed action, entity, or script.
3. Home Assistant automation translates that intent into:
   - MQTT command
   - local server webhook
   - media control action
4. Local server updates the actual playback source.
5. Frontend receives the new state and logs the event.

### What Not To Do
Do not plan around Dialogflow + Google Assistant conversational actions.

Reason:
- Google conversational Actions were sunset on June 13, 2023
- That old architecture is no longer a good foundation for this project

### Fallback Voice Path
If Google integration becomes too heavy:
- Use Home Assistant Assist for local voice
- Or use browser microphone + Web Speech as a sketch/demo fallback

Google Assistant should enhance the project, not block the whole delivery.

## End-to-End Data Flows

### Flow A: Local Track Playback
1. Frontend -> local server: `play local track`
2. Local server -> frontend: `media state updated`
3. Local server -> MQTT or HA: `event/media started`
4. HA -> automation reactions if required
5. Frontend -> telemetry deck: playback state, logs, mode changes

### Flow B: Spotify Playback
1. Frontend or local server starts Spotify auth flow
2. Local server stores tokens
3. Frontend boots Web Playback SDK
4. Spotify playback is transferred to browser device
5. Frontend receives SDK state events
6. Frontend forwards state snapshots to the local server if needed
7. Local server publishes unified media state to HA and UI

### Flow C: Sensor Automation
1. ESP32 publishes sensor event to MQTT
2. Home Assistant ingests and normalizes entity state
3. HA automation decides what should happen
4. HA publishes media or device command
5. Local server applies media side effect
6. Frontend shows telemetry and event log

### Flow D: Google Assistant Trigger
1. Voice command enters Google Assistant path
2. Home Assistant receives the command through an integration path
3. HA script maps it to an internal command
4. Local server executes media action
5. Frontend and telemetry deck reflect the result

## Source of Truth Model

| Domain | Source of Truth | Replicated To |
| --- | --- | --- |
| Local media catalog | Local server | Frontend |
| Spotify auth/session | Local server | Frontend |
| Active browser Spotify device state | Browser SDK + server mirror | Frontend, HA |
| Room sensor state | Home Assistant | Frontend, local server |
| Device health | ESP32 via MQTT -> HA | Frontend, local server |
| Mode or automation state | Home Assistant | Frontend, local server |
| UI-only view state | Frontend | No replication needed |

## MQTT Contract

Recommended topic namespace:
- `jukebox/sensors/distance`
- `jukebox/sensors/clap`
- `jukebox/sensors/mic_level`
- `jukebox/device/rssi`
- `jukebox/device/uptime`
- `jukebox/device/health`
- `jukebox/media/command`
- `jukebox/media/state`
- `jukebox/system/event`
- `jukebox/system/health`

Recommended payload style:
- JSON, not ad-hoc plain strings, except where a terminal-style display wants a raw preview
- Include timestamp and source field where possible

Example payloads:

```json
{
  "source": "esp32-sensor-1",
  "timestamp": "2026-03-19T20:14:05Z",
  "distance_cm": 42
}
```

```json
{
  "source": "ha-automation",
  "timestamp": "2026-03-19T20:14:08Z",
  "command": "set_mode",
  "value": "focus"
}
```

## Local Server API Contract

Recommended endpoints:
- `GET /api/health`
- `GET /api/media/state`
- `POST /api/media/command`
- `GET /api/library/tracks`
- `GET /api/library/playlists`
- `GET /api/logs/recent`
- `GET /api/sensors/state`
- `GET /auth/spotify/login`
- `GET /auth/spotify/callback`
- `GET /api/spotify/device`
- `GET /api/spotify/state`

Recommended realtime events:
- `media.state.updated`
- `sensor.state.updated`
- `automation.mode.updated`
- `system.health.updated`
- `log.entry.created`

## Frontend Integration Contract

Frontend should consume one unified state shape, even if the data comes from multiple subsystems.

Recommended top-level state domains:
- `media`
- `source`
- `spotify`
- `localLibrary`
- `presence`
- `sensors`
- `systemHealth`
- `eventLog`
- `ui`

Recommended frontend rule:
- UI reads from the server-provided state model
- UI does not invent a separate business state for the same real-world event

## Hardware Plan

Minimum target hardware:
- 1x ESP32
- Ultrasonic distance sensor
- Microphone or sound detection path for clap input
- Speaker + amplifier path if local hardware playback stays in scope
- Stable power supply

Hardware warning:
- Audio output, microphone capture, ultrasonic timing, and network traffic on one board can interfere with each other
- Freeze hardware pin plan early
- Decide early whether the speaker is:
  - demo-only
  - true local music output
  - secondary sound effect output

## Logging and Monitoring Plan

This is one of the strongest grading areas and should be intentional.

Minimum logging surfaces:
- `MQTT raw feed`
- `Human-readable event log`
- `ESP32 health monitor`
- `Media state changes`
- `Automation trigger history`
- `Voice command entry log`

Recommended rule:
- Every user-visible automation should produce:
  - one raw event
  - one human-readable log entry

## Security and Access

Required decisions:
- Spotify secrets must stay on the local server only
- Frontend receives only the data it needs
- If HA webhooks are exposed externally, lock them down
- If Google Assistant path requires external access, prefer the simplest secure path instead of custom insecure tunneling

Spotify auth note:
- Do not rely on old localhost alias assumptions
- For local development, be careful with the current redirect URI rules and use a valid supported redirect strategy

## Delivery Phases

### Phase 0: Architecture Freeze
Done when:
- Layer ownership is accepted
- MQTT contract is accepted
- Google Assistant path is chosen
- Hardware path is chosen

### Phase 1: Frontend State Model
Done when:
- Frontend can render unified mock state from one contract
- Local vs Spotify source switching is visible in UI
- Telemetry deck renders from structured data

### Phase 2: Local MP3 Vertical Slice
Done when:
- Local server indexes local songs
- Frontend can browse and play local tracks
- State updates and logs work end to end

### Phase 3: ESP32 + MQTT Vertical Slice
Done when:
- Distance and clap data reach HA
- Health telemetry is visible in frontend
- At least one automation is triggered by sensors

### Phase 4: Spotify Vertical Slice
Done when:
- Spotify auth works
- Browser becomes a playable Spotify device
- Frontend shows true Spotify playback state
- Logs and source badges distinguish Spotify from local

### Phase 5: Google Assistant Path
Done when:
- One voice command successfully triggers one HA automation
- HA automation controls the media path
- Result is visible in event logs and UI

### Phase 6: Demo Polish
Done when:
- Main flow is reliable
- Failure cases are handled cleanly
- Team can explain the architecture in one diagram and one minute

## Team Split For 3 People

### Track A: Frontend + UX
Owner responsibilities:
- Hero player
- source switching UI
- telemetry deck rendering
- visual polish
- websocket client

### Track B: Local Server + Media
Owner responsibilities:
- local MP3 indexing and playback path
- Spotify auth/session flow
- unified state API
- event log aggregation

### Track C: Home Assistant + ESP32 + Hardware
Owner responsibilities:
- MQTT topics
- ESP32 firmware
- clap and distance sensing
- HA automations
- Google Assistant entry path

Integration checkpoints:
- End of Phase 1: state contract freeze
- End of Phase 3: telemetry and sensors freeze
- End of Phase 4: media-source integration freeze
- End of Phase 5: demo script freeze

## Technical Corrections To Current Thinking

1. Spotify should not be planned as a raw audio source for ESP32.
2. Google Assistant should not be planned through old Dialogflow conversational actions.
3. The browser hosting Web Playback SDK becomes part of the runtime architecture, not just a UI client.
4. If the browser is closed, Spotify playback control path must fail gracefully.
5. Frontend-only playback logic will become messy fast; use the local server as the coordination hub.
6. If the hardware audio path becomes unstable, local MP3 playback should still be able to demo from browser or local server fallback.

## Demo Definition Of Done
The project is demo-ready when all of the following are true:
- Local MP3 playback works from the HAJukeBox UI
- Spotify playback works through Web Playback SDK
- Source switching is visible and clear
- Telemetry deck shows real sensor and health data
- At least two sensor-driven automations work
- At least one voice-triggered flow works
- Raw and human-readable logs both exist
- The team can explain where each subsystem starts and ends

## Open Questions
These need answers before the plan is final:
- Must Spotify audio physically come out of the ESP32-attached speaker, or can Spotify stay browser-based while ESP32 handles sensors and control?
- Is Google Assistant mandatory for grading, or a strong bonus?
- Are multiple ESP32 boards allowed?
- Will the demo environment allow external HTTPS access if required for some integrations?
- Do you want Home Assistant to be the visible automation brain, or should most logic stay hidden behind the local server?
- Do you want local voice fallback included if Google Assistant slips?

## References
- Spotify Web Playback SDK: https://developer.spotify.com/documentation/web-playback-sdk
- Spotify authorization concepts: https://developer.spotify.com/documentation/web-api/concepts/authorization
- Home Assistant Dialogflow note: https://www.home-assistant.io/integrations/dialogflow/
- Google Assistant developer overview: https://developers.google.com/assistant
