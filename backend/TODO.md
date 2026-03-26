# Backend TODO

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` done

## Phase 0: Freeze The Backend Role

- [x] Freeze the backend as the baseline media engine
- [ ] Confirm how `Home Assistant` will target playback commands
- [ ] Confirm how the frontend will read media state from the backend
- [ ] Freeze one API contract before writing real service code

## Phase 1: Service Skeleton

- [ ] Create backend project structure under `src/` and `tests/`
- [ ] Add configuration loading for local paths, ports, tokens, and HA endpoints
- [ ] Add `GET /api/health`
- [ ] Add structured logger
- [ ] Add at least 3 unit tests for health/config failure behavior

## Phase 2: Local MP3 Catalog

- [ ] Implement direct filesystem scan for the chosen media folder
- [ ] Return normalized track objects
- [ ] Return normalized playlist objects or expose an empty list cleanly
- [ ] Handle missing cover art
- [ ] Handle empty library without crashing
- [ ] Add unit tests for:
  expected library load
  empty library
  invalid or missing media path

## Phase 3: Local Playback State And Commands

- [ ] Expose `GET /api/media/state`
- [ ] Expose `POST /api/media/command`
- [ ] Support:
  `play`, `pause`, `next`, `previous`, `seek`, `set_volume`
- [ ] Normalize progress, duration, active source, and current track
- [ ] Add unit tests for:
  valid command execution
  invalid command payload
  unavailable player case

## Phase 4: Home Assistant Bridge

- [ ] Decide whether HA talks to the backend via `REST`, `webhook`, `MQTT mirror`, or a mixed path
- [ ] Mirror current media state to `Home Assistant`
- [ ] Accept HA-originated playback commands
- [ ] Publish recent media events in a way that HA can log or display
- [ ] Add tests for:
  successful state mirror
  HA unavailable case
  malformed HA response or bridge payload

## Phase 5: Frontend-Facing Realtime Updates

- [ ] Choose `WebSocket`, `SSE`, or polling-first
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
- [ ] Expose recent log entries in a frontend-friendly shape
- [ ] Expose backend health beyond simple process-up status
- [ ] Record enough detail to explain playback failures during the demo

## Phase 7: Spotify Bonus

- [ ] Add `Authorization Code with PKCE` flow
- [ ] Store refresh tokens server-side only
- [ ] Expose browser-player session state for the frontend
- [ ] Mirror Spotify source state to `Home Assistant`
- [ ] Keep Spotify optional so local MP3 still demos cleanly if this fails

## Stop Rules

- [ ] Do not start Spotify work until local MP3 playback and the HA bridge are stable
- [ ] Do not invent custom backend-only automation logic that bypasses `Home Assistant`
- [ ] Do not commit to direct Spotify audio on ESP32 as a baseline assumption
