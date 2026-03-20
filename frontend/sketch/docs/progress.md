# HAJukeBox Progress Tracker

Last updated: 2026-03-20

Purpose

- This file is the live project tracker for the frontend sketch.
- `docs/requirements.txt` stays the prioritized backlog.
- This file tracks what is done, what is in progress, and what is still missing.

Status legend

- `DONE` = implemented in the sketch
- `PARTIAL` = present, but still needs refinement or clearer behavior
- `NEXT` = should be tackled soon
- `LATER` = intentionally postponed

Current focus

- Prepare the frontend for real Home Assistant-backed data
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
- A reducer-based command layer now exists for player and UI state transitions.
- Unit tests now cover core reducer behavior for track cycling, value clamping, and invalid track commands.
- Root-level project documentation entrypoints now exist in `README.md` and `MASTER-PLAN.md`.

In progress

- Refactor `Telemetry Deck` to consume unified telemetry state instead of static imported constants.
- Define the exact Home Assistant entity and MQTT topic contract the frontend will expect.
- Prepare loading, disconnected, and empty-state handling on top of the new provider layer.

Next

- Bind `Telemetry Deck` panels and charts to `state.telemetry`.
- Add visible `loading`, `disconnected`, and `empty` UI states for the provider-backed app shell.
- Write the first Home Assistant adapter draft against the unified state contract.
- Freeze a concrete HA entity list and MQTT topic list for the baseline local MP3 flow.

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
