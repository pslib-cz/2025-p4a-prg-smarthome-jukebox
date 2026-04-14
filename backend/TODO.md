# Backend TODO

Last reviewed: 2026-04-14

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` done

## Phase 0: Contract Freeze

- [x] Freeze the backend as the baseline media engine
- [x] Confirm how the frontend reads media state from the backend
- [x] Freeze one polling-first HTTP API contract before realtime work
- [-] Document the hardened backend contract directly in `backend/README.md` and route tests
- [-] Confirm how `Home Assistant` will target playback commands through the backend bridge
- [-] Freeze structured error payloads plus media availability and capability fields

## Phase 1: Service Skeleton

- [x] Create backend project structure under `src/` and `tests/`
- [x] Add configuration loading for local paths, ports, tokens, and HA endpoints
- [x] Add `GET /api/health`
- [x] Add structured logger
- [x] Add at least 3 unit tests for health/config failure behavior

## Phase 2: Local MP3 Catalog

- [x] Implement direct filesystem scan for the chosen media folder
- [x] Return normalized track objects
- [x] Return normalized playlist objects or expose an empty list cleanly
- [x] Handle missing cover art
- [x] Handle empty library without crashing
- [x] Add unit tests for:
  expected library load
  empty library
  invalid or missing media path

## Phase 3: Local MP3 Browser Playback Slice

- [x] Expose `GET /api/media/state`
- [x] Expose `POST /api/media/command`
- [x] Expose `GET /api/library/tracks/:trackId/stream` for browser playback
- [x] Expose `POST /api/library/rescan`
- [x] Support API-level commands:
  `play`, `pause`, `next`, `previous`, `seek`, `set_volume`, `play_track`
- [-] Normalize progress, duration, active source, and current track for browser-backed playback
- [-] Keep backend media state synchronized with frontend-managed audio lifecycle
- [ ] Add machine-readable error payloads for invalid command, unknown track, conflict, and unavailable dependency cases
- [ ] Add unit tests for:
  valid command execution
  invalid command payload
  unknown track id
  unavailable player case
  structured error payloads

## Phase 4: Home Assistant Bridge

- [-] Freeze how HA talks to the backend for media commands:
  `REST`, `webhook`, `MQTT mirror`, or a mixed path
- [-] Mirror current media summary to `Home Assistant`
- [-] Accept HA-originated playback commands
- [-] Publish recent media events in a way that HA can log or display
- [ ] Add tests for:
  successful state mirror
  HA unavailable case
  malformed HA response or bridge payload

## Phase 5: Frontend-Facing Sync And Realtime

- [x] Keep polling-first HTTP usable as the baseline transport
- [ ] Decide whether the demo actually needs `WebSocket` or `SSE`
- [ ] Emit `media.state.updated`
- [ ] Emit `library.updated`
- [ ] Emit `system.health.updated`
- [ ] Emit `log.entry.created`
- [ ] Add tests for:
  normal subscription flow
  disconnect and reconnect flow
  invalid subscriber or transport error

## Phase 6: Observability

- [ ] Log startup, shutdown, media command execution, and bridge failures
- [x] Expose recent log entries in a frontend-friendly shape
- [ ] Expose backend health beyond simple process-up status
- [ ] Record enough detail to explain playback failures during the demo

## Phase 7: Spotify Bonus

- [x] Add `Authorization Code with PKCE` flow
- [x] Store refresh tokens server-side only
- [x] Expose browser-player session state for the frontend
- [x] Mirror Spotify source state to `Home Assistant`
- [x] Keep Spotify optional so local MP3 still demos cleanly if this fails
- [ ] Run one manual smoke with a real Spotify Premium account

## Stop Rules

- [ ] Do not start Spotify work until local MP3 playback and the HA bridge are stable
- [ ] Do not invent custom backend-only automation logic that bypasses `Home Assistant`
- [ ] Do not commit to direct Spotify audio on ESP32 as a baseline assumption
