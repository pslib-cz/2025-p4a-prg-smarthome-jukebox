# Home Assistant TODO

Last reviewed: 2026-04-15

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` done

## Phase 0: Runtime Freeze

- [-] Prefer `Home Assistant Container` via Docker for team development and decide the final demo host:
  dedicated host, mini PC, Linux VM, or other always-on local machine
- [-] Freeze entity names before frontend and backend adapters are written
- [-] Freeze MQTT topic names before ESP32 and HA packages are written
- [x] Freeze how HA media scripts call the backend bridge
- [x] Freeze the second local HA integration needed for team-of-3 compliance
- [x] Choose the `Ping` target and freeze the final entity ID before presence fusion depends on it

## Phase 1: Base Setup

- [x] Install and boot `Home Assistant`
- [x] Create or reserve the final config structure inside this folder
- [x] Install and configure the `MQTT` integration
- [x] Add the second local HA integration, recommended `Ping`
- [-] Verify API access for frontend development
- [ ] Remove `Music Assistant` if it was installed only for testing

## Phase 2: MQTT Ingest

- [ ] Map `distance` topic into a stable sensor
- [ ] Map `clap` topic into a stable event or helper flow
- [ ] Map `rssi` topic into a diagnostic sensor
- [ ] Map `uptime` topic into a diagnostic sensor
- [ ] Map broker and device health into a visible HA state
- [ ] Validate reconnect behavior when MQTT temporarily drops

## Phase 3: Helpers And Entity Model

- [x] Create `input_select.hajukebox_mode`
- [x] Create `sensor.hajukebox_media_source`
- [ ] Create presence confidence and reason entities
- [ ] Create clap count helper or mirrored daily count
- [x] Create `sensor.hajukebox_backend_status`
- [x] Create media summary helpers mirrored from backend state
- [ ] Keep names stable and frontend-friendly

## Phase 4: Scripts

- [x] Add `play` script that proxies the backend media path
- [x] Add `pause` script that proxies the backend media path
- [x] Add `next` script that proxies the backend media path
- [x] Add `previous` script that proxies the backend media path
- [x] Add `set_volume` script that proxies the backend media path
- [x] Add `set_mode`
- [x] Validate script calls from HA UI and automations into the backend bridge

## Phase 5: Automations

- [x] Presence-triggered focus mode
- [x] Eco or off when presence is truly gone
- [ ] Clap-triggered shortcut if still desired
- [ ] Media-state event logging
- [ ] Disconnect and recovery logging

## Phase 6: Frontend Contract Validation

- [-] Confirm the frontend can fetch initial state from HA
- [-] Confirm the frontend can subscribe to live updates via WebSocket
- [ ] Confirm the frontend can derive:
  distance
  clap count
  presence confidence
  RSSI
  uptime
  MQTT connected state
  mode
  backend status
- [-] Confirm HA-exposed media summary is sufficient for demo defense
- [ ] Decide which event-log items come from HA and which stay in MQTT or backend streams

## Phase 7: Bonus Paths

- [x] Add Google Assistant-ready request entities, automations, and voice feedback helpers
- [ ] Link a real Google Home / Google Assistant project and run one manual smoke
- [x] Mirror Spotify source state into HA
- [ ] Add Spotify-triggered scripts only after the browser playback path exists

## Stop Rules

- [ ] Do not let Spotify or Google delay the baseline local MP3 path
- [ ] Do not rename entities casually after the frontend adapter starts depending on them
- [ ] Do not move automation logic into the backend unless HA genuinely cannot own it
