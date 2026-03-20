# HAJukeBox Master Plan

This file is the root-level entrypoint for the project plan so the main architecture and delivery direction are visible directly from the repository root.

## Status

- Baseline priority: `Local MP3 + Home Assistant + telemetry + ESP32`
- Bonus priority: `Spotify Web Playback SDK`
- Optional bonus: `Google Assistant`

## Core Decisions

1. `Local MP3` is the required success path.
2. `Home Assistant` stays the central runtime and automation system.
3. The frontend must be able to consume real data without depending on a hidden custom backend for the baseline path.
4. `ESP32` handles sensing and hardware I/O, not the full business logic of the system.
5. `Spotify` is valuable, but it must not delay the required local playback path.

## Delivery Order

1. Finalize the frontend state contract and mock-driven UI.
2. Bind the frontend to real `Home Assistant` and `MQTT` telemetry.
3. Deliver the real `local MP3` control path.
4. Freeze the baseline demo path.
5. Attempt `Spotify Web Playback SDK` as a bonus integration.
6. Add `Google Assistant` only if the baseline is already stable.

## Where To Read Next

- Full architecture and ownership plan: [docs/idea/master-plan.md](./docs/idea/master-plan.md)
- Frontend implementation steps: [docs/idea/frontend-implementation-plan.md](./docs/idea/frontend-implementation-plan.md)
- Live project tracker: [docs/progress.md](./docs/progress.md)
- Prioritized requirement list: [docs/requirements.txt](./docs/requirements.txt)
