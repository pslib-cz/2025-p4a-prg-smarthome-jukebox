# HAJukeBox Frontend Implementation Plan

Last updated: 2026-03-24
Status: Active

## Goal
Move the current frontend from a visual sketch with local mock state to a client prepared for real Home Assistant and MQTT data.

## Baseline Rule
- The required frontend path must work with `Home Assistant` as the central system.
- Do not make a custom local server a hidden dependency for the baseline flow.
- `Local MP3 + telemetry + control` comes before Spotify and Google Assistant.

## Frontend Priorities
1. Replace scattered mock state with one typed app-state contract.
2. Separate `UI rendering` from `data source`.
3. Make the UI able to consume:
   - mock data now
   - Home Assistant data later
   - optional bonus sources later
4. Keep current design and interaction feel while rewiring the data layer.

## Scope Split

### Baseline
- local MP3 source
- current track state
- library list
- telemetry deck
- event log
- system health
- sensor values
- command buttons and sliders

### Bonus
- Spotify source
- Google Assistant entry state
- source switching between local and Spotify

## Phase Plan

### Phase 0: Contract Freeze
Goal:
- Define one frontend state shape that matches the real system.

Tasks:
1. Create shared TypeScript types for app state, telemetry state, media state, and commands.
2. Stop adding new hardcoded values directly inside UI components.
3. Decide what the frontend actually expects from HA.

Done when:
- there is one state contract for the whole app
- components can be mapped to that contract

### Phase 1: Mock Source Adapter
Goal:
- Keep the current UI working, but route it through a typed data-source layer.

Tasks:
1. Create a `mock` data source that returns the unified state contract.
2. Create a lightweight provider or hook for reading that state.
3. Keep the UI visually unchanged.

Done when:
- the app can read from `mockJukeboxState` instead of only local inline constants

### Phase 2: UI Binding Refactor
Goal:
- Make the main screens consume the unified contract instead of hand-rolled local values.

Tasks:
1. Bind hero player to unified `media` state.
2. Bind song list and playlists to unified `library` state.
3. Bind `Telemetry Deck` to unified `telemetry` state.
4. Bind source badge, progress, and player metadata to unified state.

Done when:
- changing the state object changes the whole UI in a predictable way

### Phase 3: Command Channel
Goal:
- Separate `read state` from `send command`.

Tasks:
1. Define typed commands such as:
   - `play`
   - `pause`
   - `next`
   - `previous`
   - `set_volume`
   - `set_mode`
   - `set_dsp_profile`
2. Route UI controls through one command API instead of direct component-local assumptions.
3. Keep mock command handlers for now.

Done when:
- the UI can issue commands without knowing whether the backend is mock or HA

### Phase 4: Home Assistant Data Adapter
Goal:
- Prepare the real baseline integration path.

Tasks:
1. Decide which data comes from:
   - HA REST API
   - HA WebSocket API
   - MQTT over WebSockets
2. Build an adapter that maps HA payloads into the frontend app-state contract.
3. Add connection status handling:
   - `connecting`
   - `connected`
   - `disconnected`
   - `error`

Done when:
- the frontend can consume real HA-shaped data through one adapter

### Phase 5: Real Telemetry Wiring
Goal:
- Replace fake telemetry in the UI with real entity and MQTT-backed values.

Tasks:
1. Wire presence, distance, clap, RSSI, uptime, and logs to real data.
2. Preserve the current deck visuals, but drive them from real state.
3. Add fallback placeholders when a value is missing.

Done when:
- `Telemetry Deck` is no longer a static sketch

### Phase 6: Real Local MP3 Wiring
Goal:
- Make the required local media path real.

Tasks:
1. Decide how HA exposes local MP3 playback state.
2. Bind hero controls to that entity or media command path.
3. Show real metadata, progress, source, and playback state.
4. Keep graceful empty/loading states.

Done when:
- local MP3 playback is fully represented in the frontend

### Phase 7: Bonus Integrations
Goal:
- Add bonus features only after the baseline path is stable.

Tasks:
1. Spotify source state and auth UI
2. Spotify playback state in hero/player
3. Optional Google Assistant feedback state

Done when:
- bonus integrations do not break the required local MP3 flow

## Small-Step Task List

### Step 1
- Add `src/state/` types for unified app state and commands.
Status:
- done

### Step 2
- Add `mock` app state and `mock` data source.
Status:
- done

### Step 3
- Add one hook/provider that exposes `state`, `status`, and `sendCommand`.
Status:
- done

### Step 4
- Refactor hero player to read from unified state.
Status:
- done

### Step 5
- Refactor playlist and song list to read from unified state.
Status:
- done

### Step 6
- Refactor `Telemetry Deck` to read from unified state.
Status:
- done

### Step 7
- Add loading, disconnected, and empty-state UI.
Status:
- done

### Step 8
- Build HA adapter for baseline entities and MQTT events.
Status:
- in progress

### Step 9
- Replace mock telemetry with real telemetry.
Status:
- pending

### Step 10
- Replace mock local playback with real HA-backed local playback.
Status:
- pending

Progress note:
- typed remote snapshot contracts now exist
- HA telemetry and backend media mapper functions now exist
- a provider-compatible remote data source scaffold now exists
- the next implementation step is to replace scaffold transports with real HTTP/WebSocket clients

### Step 11
- Freeze the baseline frontend.
Status:
- pending

### Step 12
- Start optional Spotify work.
Status:
- later

## Recommended HA-First Data Split

### Read Path
- `HA entity state` for media, modes, and integrations
- `MQTT over WebSockets` for live telemetry and terminal-like feed
- `HA WebSocket API` or REST for dashboard synchronization

### Write Path
- HA service calls or exposed commands for:
  - media control
  - mode change
  - device actions
- MQTT publish only where that is already the intended HA/device control path

## Current Component Refactor Order
1. `App.tsx`
2. `SignalBay.tsx`
3. `appSketchData.ts`
4. `signalBayData.ts`
5. slider/button command wiring

## Risks
1. If the frontend keeps local business state for too long, real integration will become messy.
2. If HA entities are not defined clearly enough, the UI contract will drift from the real system.
3. If Spotify work starts too early, the required local MP3 path will slip.
4. If telemetry uses a different state model than the player, the dashboard will feel fake again.

## Immediate Next Step
Implement the first UI resiliency pass:
- add minimal provider-backed loading and disconnected states
- reduce remaining telemetry constants to decorative-only scaffolding
- freeze the first HA entity and MQTT topic contract draft

That is the smallest useful next step after the Telemetry Deck binding, and it moves the app from mock-ready to adapter-ready.
