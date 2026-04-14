# HAJukeBox Master Plan

This file is the frontend-facing summary entrypoint for the dashboard work.
The primary project architecture document lives in `../docs/idea/master-plan.md`.

## Status

- Baseline priority: `Local MP3 + Home Assistant + backend media service + telemetry + ESP32`
- Bonus priority: `Spotify Web Playback SDK`
- Optional bonus: `Google Assistant`
- Current frontend state: real backend HTTP reads and browser-backed local MP3 playback are already wired
- Current frontend state: real `Home Assistant` telemetry transport already exists behind env configuration
- Main remaining frontend work: live HA validation and tighter playback sync hardening

## Core Decisions

1. `Local MP3` is the required success path.
2. `Home Assistant` stays the central runtime and automation system.
3. The custom backend is the explicit owner of media state and playback coordination for `Local MP3` and later `Spotify`.
4. The frontend must consume `Home Assistant` and backend data through explicit adapters instead of hiding both concerns behind one mixed transport.
5. `ESP32` handles sensing and hardware I/O, not the full business logic of the system.
6. `Spotify` is valuable, but it must not delay the required local playback path.

## Delivery Order

1. Validate the real `Home Assistant` telemetry transport against the final entity contract.
2. Tighten backend media sync and browser-backed `Local MP3` playback behavior.
3. Freeze the baseline demo path.
4. Attempt `Spotify Web Playback SDK` as a bonus integration.
5. Add `Google Assistant` only if the baseline is already stable.

## Where To Read Next

- Full architecture and ownership plan: [docs/idea/master-plan.md](../docs/idea/master-plan.md)
- Frontend implementation steps: [docs/idea/frontend-implementation-plan.md](../docs/idea/frontend-implementation-plan.md)
- Live project tracker: [docs/progress.md](../docs/progress.md)
- Prioritized requirement list: [docs/requirements.txt](../docs/requirements.txt)
