# HAJukeBox Progress Tracker

Last updated: 2026-03-19

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

- Technical monitoring and telemetry presentation
- Stronger scoring-proof UI for MQTT, ESP32 health, and event logging
- Keep the vinyl/music console identity intact

Done

- `Telemetry Deck` replaced the older `Signal Bay` naming and now reads as the technical system layer.
- Presence radar was preserved and expanded with clearer sensor-fusion context.
- Presence confidence gauge is implemented.
- Live distance graph is implemented.
- MQTT live feed terminal is implemented.
- System health monitor is implemented with `RSSI`, `MQTT Connected`, `TLS`, `uptime`, and latency.
- Human-readable event log is implemented.
- Sensor-to-action traceability lanes are implemented.
- Clap activity graph remains present inside the telemetry deck.
- Basic audio telemetry was added inside the telemetry deck as a technical preview.

In progress

- Refine telemetry copy so the panels feel even more tied to the exact school project story.
- Decide whether the telemetry deck should visually lean more toward `console rack`, `lab panel`, or `terminal wall`.

Next

- Add explicit clap counter as a dedicated daily metric, not only as trace/readout text.
- Tighten the relation between telemetry state and visible UI reactions in the hero section.
- Review whether the `Audio Telemetry` panel should stay in the deck or move later closer to the center player.
- Tune responsive layout of the telemetry deck on smaller laptop widths.

Later

- Dynamic track source badge in the center area (`Spotify` vs `Local`).
- Master volume as one synchronized primary control.
- Dedicated audio quality strip in the center player.
- DSP preset controls in the main playback area.
- Mode selector with larger described buttons.
- Voice trigger entry.

Requirement tracking

| ID  | Priority | Requirement                              | Status  | Note                                                              |
| --- | -------- | ---------------------------------------- | ------- | ----------------------------------------------------------------- |
| 1   | P0       | MQTT live feed terminal                  | DONE    | Implemented in Telemetry Deck as terminal-style raw topic feed    |
| 2   | P0       | System health monitor                    | DONE    | RSSI, MQTT status, TLS, uptime, latency are visible               |
| 3   | P0       | Human-readable event log                 | DONE    | Implemented as readable timestamped event cards                   |
| 4   | P0       | Sensor-to-action traceability            | DONE    | Explicit input/fusion/output lanes added                          |
| 5   | P1       | Dynamic track metadata with source badge | PARTIAL | Track metadata exists in hero, source badge still missing         |
| 6   | P1       | Master volume slider                     | PARTIAL | Volume exists, but not framed as synchronized master volume       |
| 7   | P1       | Audio status strip                       | PARTIAL | Technical preview exists inside Telemetry Deck, not in hero       |
| 8   | P1       | DSP sound profiles                       | PARTIAL | Technical preview exists inside Telemetry Deck, not in hero       |
| 9   | P1       | Visualizer / VU meter                    | DONE    | Existing hero visualizer already covers this                      |
| 10  | P2       | Live distance graph                      | DONE    | Added to Telemetry Deck                                           |
| 11  | P2       | Presence confidence gauge                | DONE    | Added to Telemetry Deck                                           |
| 12  | P2       | Clap counter                             | PARTIAL | Clap activity is shown, but dedicated daily counter still missing |
| 13  | P3       | Mode selector with descriptions          | LATER   | Deferred on purpose                                               |
| 14  | P3       | Voice trigger entry                      | LATER   | Deferred on purpose                                               |

Update rule

- After each meaningful change, update the `Done`, `In progress`, `Next`, and `Requirement tracking` sections in this file.
- If priorities change, update `docs/requirements.txt` separately.
