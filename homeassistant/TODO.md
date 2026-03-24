# Home Assistant TODO

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` done

## Phase 0: Runtime Freeze

- [ ] Decide where Home Assistant runs:
  dedicated host, mini PC, VM, or other always-on local machine
- [ ] Decide whether `Music Assistant` is the primary local playback engine
- [ ] Freeze entity names before frontend and backend adapters are written
- [ ] Freeze MQTT topic names before ESP32 and HA packages are written

## Phase 1: Base Setup

- [ ] Install and boot Home Assistant
- [ ] Create or reserve the final config structure inside this folder
- [ ] Install and configure the MQTT integration
- [ ] Install and configure Music Assistant if it is used for baseline playback
- [ ] Verify API access for frontend development

## Phase 2: MQTT Ingest

- [ ] Map `distance` topic into a stable sensor
- [ ] Map `clap` topic into a stable event or helper flow
- [ ] Map `rssi` topic into a diagnostic sensor
- [ ] Map `uptime` topic into a diagnostic sensor
- [ ] Map broker/device health into a visible HA state
- [ ] Validate reconnect behavior when MQTT temporarily drops

## Phase 3: Helpers And Entity Model

- [ ] Create `input_select.hajukebox_mode`
- [ ] Create media source summary entity
- [ ] Create presence confidence and reason entities
- [ ] Create clap count helper or mirrored daily count
- [ ] Create backend-status helper if the backend exposes health
- [ ] Keep names stable and frontend-friendly

## Phase 4: Scripts

- [ ] Add `play`
- [ ] Add `pause`
- [ ] Add `next`
- [ ] Add `previous`
- [ ] Add `set_volume`
- [ ] Add `set_mode`
- [ ] Validate script calls from both HA UI and external clients

## Phase 5: Automations

- [ ] Presence-triggered focus mode
- [ ] Eco/off when presence is truly gone
- [ ] Clap-triggered shortcut if still desired
- [ ] Media-state event logging
- [ ] Disconnect and recovery logging

## Phase 6: Frontend Contract Validation

- [ ] Confirm the frontend can fetch initial state from HA
- [ ] Confirm the frontend can subscribe to live updates via WebSocket
- [ ] Confirm the frontend can derive:
  distance
  clap count
  presence confidence
  RSSI
  uptime
  MQTT connected state
  mode
  media state
- [ ] Decide which event-log items come from HA and which stay in MQTT/backend streams

## Phase 7: Bonus Paths

- [ ] Expose selected entities to Assist or Google only after baseline is stable
- [ ] Mirror Spotify source state into HA
- [ ] Add Spotify-triggered scripts only after the browser playback path exists

## Stop Rules

- [ ] Do not let Spotify or Google delay the baseline local MP3 path
- [ ] Do not rename entities casually after the frontend adapter starts depending on them
- [ ] Do not move automation logic into the backend unless HA genuinely cannot own it
