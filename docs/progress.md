# HAJukeBox Progress Tracker

Last updated: 2026-03-27

Purpose

- This file is the live project tracker for the frontend application.
- `docs/requirements.txt` stays the prioritized backlog.
- This file tracks what is done, what is in progress, and what is still missing.

Status legend

- `DONE` = implemented in the frontend
- `PARTIAL` = present, but still needs refinement or clearer behavior
- `NEXT` = should be tackled soon
- `LATER` = intentionally postponed

Current focus

- Freeze the Home Assistant contract while keeping the new backend-backed local playback path stable
- Keep local MP3 as the baseline required media path
- Preserve the current music-console visual identity while rewiring the data layer

Done

- `Telemetry Deck` replaced the older `Signal Bay` naming and now reads as the technical system layer.
- Presence radar was preserved and expanded with clearer sensor-fusion context.
- Presence confidence gauge is implemented.
- Live distance graph is implemented.
- Dedicated clap counter is implemented.
- MQTT live feed terminal is implemented.
- System health monitor is implemented with `RSSI`, `MQTT Connected`, `TLS`, `uptime`, and latency.
- Human-readable event log is implemented.
- Sensor-to-action traceability lanes are implemented.
- Clap activity graph remains present inside the telemetry deck.
- Basic audio telemetry was added inside the telemetry deck as a technical preview.
- Hero player now has a subtle `metadata <-> audio status` toggle under the song title.
- `Volume` is now presented as `Master` volume in the mixer.
- DSP preset switches are implemented in the left `Effects` panel.
- Left and right side panels now use matching width.
- Frontend implementation roadmap for real data was written.
- Initial `src/state/` scaffolding now exists for unified app state and data-source contracts.
- A stateful mock data source now supports `getInitialState`, `sendCommand`, and live `subscribe`.
- A shared React provider and hook now expose `state`, `status`, and `sendCommand`.
- The hero player now reads track, playback, progress, volume, theme, and DSP profile from unified app state.
- The song list and playlists now read from unified library state instead of local inline constants.
- `Telemetry Deck` now reads live panel data from unified telemetry and media state instead of component-local constants.
- The right panel now supports `Local Music <-> Spotify` UI mode switching.
- A dedicated Spotify sketch panel now exists for auth, SDK, transfer, scopes, and browser-device states.
- The Spotify sketch panel was simplified into a more minimal two-view surface with hidden setup details.
- The Spotify sketch panel now explicitly separates `Player` and `Tech` views and no longer overlaps the footer switch button.
- Spotify sketch state now lives inside the shared app contract instead of as isolated component-only mock UI.
- Theme-colored semi-transparent scrollbars now style overflow areas in a more consistent way.
- A reducer-based command layer now exists for player and UI state transitions.
- Unit tests now cover core reducer behavior for track cycling, value clamping, and invalid track commands.
- Unit tests now also cover `Telemetry Deck` view-model mapping and chart-point generation.
- Unit tests now also cover Spotify sketch state/view-model transitions.
- Repository documentation entrypoints now exist in `README.md` and `frontend/MASTER-PLAN.md`.
- A shell-level status banner now exposes `live`, `syncing`, `offline`, `standby`, and `error` states from the provider-backed app state, and it now lives inside `Telemetry Deck` instead of the hero.
- The local music panel now has explicit empty-state surfaces for songs and playlists, so real data gaps no longer collapse into blank sections.
- Unit tests now also cover app-shell status derivation for loading, standby, offline, and error scenarios.
- Typed remote contracts now exist for `Home Assistant telemetry snapshots` and `backend media/library snapshots`.
- Pure mapper functions now translate HA entity payloads and backend media payloads into the shared frontend app-state contract.
- A `RemoteJukeboxDataSource` scaffold now exists for merging HA telemetry and backend media into one provider-compatible data source.
- Unit tests now also cover HA telemetry mapping, backend media mapping, and combined remote-state derivation.
- The frontend now lives in the top-level `frontend/` folder instead of `frontend/sketch/`.
- The frontend now reads real backend media, library, and recent-log data over HTTP.
- Local MP3 browser playback now works through the backend track stream endpoint and a frontend-managed audio element.

In progress

- Define the exact Home Assistant entity and MQTT topic contract the frontend will expect.
- Start separating purely decorative telemetry constants from baseline HA-driven telemetry data.
- Decide how the first real telemetry adapter should expose freshness and reconnect timing into the shell state.
- Replace the remaining mock `Home Assistant` transport with a real HA HTTP/WebSocket client.
- Tighten browser playback sync so seek/progress reflect real audio position instead of state-only placeholders.

Next

- Freeze a concrete HA entity list and MQTT topic list for the baseline local MP3 flow.
- Bind the remote data source scaffold to real HA fetch/subscribe transport functions.
- Reduce remaining static telemetry fallback data to only visual scaffolding markers and labels.
- Add matching empty/offline placeholders inside `Telemetry Deck` panels once the HA telemetry contract is frozen.
- Decide how the future real Spotify auth and SDK events will map onto the new Spotify sketch state.

Later

- Dynamic track source badge in the center area (`Spotify` vs `Local`).
- Spotify source path and source switching.
- Google Assistant feedback state.
- Mode selector with larger described buttons.
- Voice trigger entry.

Requirement tracking

| ID  | Priority | Requirement                              | Status  | Note                                                              |
| --- | -------- | ---------------------------------------- | ------- | ----------------------------------------------------------------- |
| 1   | P0       | MQTT live feed terminal                  | DONE    | Implemented in Telemetry Deck as terminal-style raw topic feed    |
| 2   | P0       | System health monitor                    | DONE    | RSSI, MQTT status, TLS, uptime, latency are visible               |
| 3   | P0       | Human-readable event log                 | DONE    | Implemented as readable timestamped event cards                   |
| 4   | P0       | Sensor-to-action traceability            | DONE    | Explicit input/fusion/output lanes added                          |
| 5   | P1       | Dynamic track metadata with source badge | PARTIAL | Metadata exists, source badge still needs real local/Spotify state |
| 6   | P1       | Master volume slider                     | DONE    | The mixer presents the primary channel as Master volume           |
| 7   | P1       | Audio status strip                       | DONE    | Audio status is available under the song title in the hero        |
| 8   | P1       | DSP sound profiles                       | DONE    | DSP preset switches exist in the left Effects panel               |
| 9   | P1       | Visualizer / VU meter                    | DONE    | Existing hero visualizer already covers this                      |
| 10  | P2       | Live distance graph                      | DONE    | Added to Telemetry Deck                                           |
| 11  | P2       | Presence confidence gauge                | DONE    | Added to Telemetry Deck                                           |
| 12  | P2       | Clap counter                             | DONE    | Dedicated daily clap count is visible in the Telemetry Deck       |
| 13  | P3       | Mode selector with descriptions          | LATER   | Deferred on purpose                                               |
| 14  | P3       | Voice trigger entry                      | LATER   | Deferred on purpose                                               |

Update rule

- After each meaningful change, update the `Done`, `In progress`, `Next`, and `Requirement tracking` sections in this file.
- If priorities change, update `docs/requirements.txt` separately.
