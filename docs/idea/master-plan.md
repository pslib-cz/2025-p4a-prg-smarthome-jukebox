# HAJukeBox Master Plan

Last updated: 2026-03-26
Status: Draft v1.2

## Context Note
- This plan is aligned against the current repository, the school assignment, and the decisions confirmed in chat.
- Older idea documents may still contain historical assumptions that are no longer valid.
- The architecture is now frozen unless the team explicitly decides otherwise.
- Confirmed constraints from the team:
  - exactly `1x ESP32`
  - `Google Assistant` is welcome, but not required for baseline success
  - `Local MP3` is the main mandatory playback path
  - `Spotify` is a bonus / nice-to-have feature
  - the team wants `Spotify` and `local MP3` to end up on the same speaker path if possible

## Assignment Compliance Correction
The school assignment adds these important baseline constraints:

- `Home Assistant` must remain the central system
- the project should avoid depending on external cloud systems or hidden off-platform runtime truth
- the dashboard should stay explainable as part of the HA-centered architecture

Chosen interpretation for this project:

- `Home Assistant` remains the visible automation and monitoring brain
- the custom local server is allowed as a local media subsystem because it owns only the media domain
- the frontend reads `Home Assistant` for automation, telemetry, and room state
- the frontend reads the local server for media library and playback state
- for strict assignment defense, the backend must mirror essential media state and commands back into `Home Assistant`

This matters most for frontend planning:

- real data preparation must keep `HA` and backend adapters separate
- `local MP3 + telemetry + control` is still the baseline delivery path
- Spotify remains a bonus extension on top of the same media-server contract

## Executive Summary
HAJukeBox should be built as a multi-layer local smart jukebox system with a strong visual frontend, a local application server, Home Assistant for automation and device orchestration, and one ESP32 node for physical sensing and actuator control.

The project should support two media paths:
- `Local MP3 path`: fully owned playback path that we control end to end
- `Spotify path`: browser playback through Spotify Web Playback SDK, with metadata, state, and control exposed into the same HAJukeBox UI and automation model as a bonus path

The recommended architecture is:
- `Frontend`: visual UI, user controls, browser-side Spotify player host, live telemetry presentation
- `Home Assistant`: required central automation/runtime system, entity state, MQTT broker integration, room/device logic
- `Local server`: baseline media subsystem for local MP3 and later Spotify session handling
- `ESP32`: raw sensor acquisition and hardware actuation, not business-logic orchestration

## Project Goals
1. Deliver a music-first interface that still proves monitoring, automation, and logging quality.
2. Deliver local MP3 playback as the reliable required baseline path.
3. Add Spotify through the officially supported browser playback path if time and hardware reality allow it.
4. Integrate room presence and interaction sensors through ESP32 and MQTT.
5. Treat Google Assistant as a bonus trigger path into the system, not the central application runtime.
6. Keep the whole system understandable enough for a 3-person team.

## Non-Negotiable Decisions
1. Spotify audio will not be streamed as raw MP3 or PCM into ESP32 through the standard Web API.
2. The frontend is not the long-term source of truth for automation or device state.
3. Home Assistant should own home/device automation state.
4. The local server should own media state and session coordination.
5. ESP32 should publish sensor data and execute commands, but not decide system behavior on its own.
6. MQTT should be the shared event bus between ESP32, Home Assistant, and the local server.
7. Google Assistant is a bonus integration path, not a baseline delivery blocker.
8. Local MP3 playback is the baseline success criterion for the media layer.
9. Spotify integration is valuable, but it must not jeopardize the required local MP3 path.

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
- Receives live updates from `Home Assistant` and the local server through explicit adapters
- Sends automation-oriented commands to `Home Assistant`
- Sends media-oriented commands to the local server

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
- Keeps media concerns out of `Home Assistant` without moving automation truth away from HA

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
- Because the current team constraint is `1x ESP32`, the first fallback should be moving the main audio host away from the ESP, not adding another board unless scope changes

## Media Strategy

### Local MP3 Path
This is the primary required demo path.

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
- It is the required media feature even if bonus integrations slip

### Spotify Path
Spotify should use Web Playback SDK in the browser if this bonus path is implemented.

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

### Audio Output Reality Check
The team wants Spotify and local MP3 to play through the same ESP-related speaker setup. That is a valid product goal, but it needs a realistic interpretation.

What is safe to promise:
- Local MP3 can target an ESP-managed speaker path if the firmware/audio path is stable
- Spotify can be controlled and rendered through Web Playback SDK in the browser
- The whole system can still expose one unified UI, one mode system, and one automation model

What is not safe to promise as a baseline:
- One ESP32 directly decoding Spotify audio from the standard Spotify APIs while also handling mic, ultrasonic, MQTT, and other tasks

Recommended interpretation:
- `Baseline path`: Spotify plays in the browser host, local MP3 can use the ESP-attached audio path if stable
- `Unified product feel`: the UI, logs, commands, and automations treat both sources as one jukebox
- `Stretch goal`: make both sources converge onto the exact same physical speaker path if hardware tests prove it is stable

Because Spotify is currently a bonus feature, this whole path should be attempted only after the local MP3 path is stable.
If the school demo absolutely requires Spotify audio to come out of the ESP-attached speaker, that becomes a dedicated technical risk item and should not be hidden inside the baseline schedule.

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

Google Assistant should enhance the project, not block the whole delivery. In the current plan it is a bonus, not a hard dependency.

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

Output note:
- Baseline assumption: Spotify audio is physically emitted by the browser host playback device
- System goal: the user should still experience this as one HAJukeBox source, even if the hardware output path differs internally

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
- Treat the ESP-attached speaker path as `local playback first`
- Treat `Spotify through the same exact ESP speaker path` as a high-risk integration until proven in hardware
- If the single-board design becomes unstable, move the Spotify audio host off the ESP before changing the rest of the architecture

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
- This phase is mandatory for baseline project success

### Phase 3: ESP32 + MQTT Vertical Slice
Done when:
- Distance and clap data reach HA
- Health telemetry is visible in frontend
- At least one automation is triggered by sensors

### Phase 4: Optional Spotify Vertical Slice
Done when:
- Spotify auth works
- Browser becomes a playable Spotify device
- Frontend shows true Spotify playback state
- Logs and source badges distinguish Spotify from local
- The team explicitly verifies whether this is enough for the required demo, or whether same-speaker-path output must be escalated into an extra milestone

### Phase 5: Optional Google Assistant Path
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
7. `Spotify through one ESP32-attached speaker` is the main unresolved hardware-risk requirement.
8. The team should finish and stabilize the local MP3 path before attempting Spotify or Google Assistant.

## Baseline Definition Of Done
The baseline project is demo-ready when all of the following are true:
- Local MP3 playback works from the HAJukeBox UI
- Telemetry deck shows real sensor and health data
- At least two sensor-driven automations work
- Raw and human-readable logs both exist
- The team can explain where each subsystem starts and ends

## Bonus Definition Of Done
These are stretch outcomes, not baseline blockers:
- Spotify playback works through Web Playback SDK
- Source switching between local and Spotify is visible and clear
- At least one voice-triggered flow works through Google Assistant or a fallback voice path

## Open Questions
These need answers before the plan is final:
- Will the demo environment allow external HTTPS access if required for some integrations?
- Does `Spotify through ESP` mean the exact same physical speaker output, or is it acceptable if Spotify stays browser-hosted while the ESP remains the room-control node?
- Do you want local voice fallback included if Google Assistant slips?

## References
- Spotify Web Playback SDK: https://developer.spotify.com/documentation/web-playback-sdk
- Spotify authorization concepts: https://developer.spotify.com/documentation/web-api/concepts/authorization
- Home Assistant Dialogflow note: https://www.home-assistant.io/integrations/dialogflow/
- Google Assistant developer overview: https://developers.google.com/assistant
