# HAJukeBox Frontend

Frontend dashboard for the smart jukebox project built with `React`, `TypeScript`, and `Vite`.

The current repository focus is:
- preserve the music-console visual identity
- prepare the UI for real `Home Assistant`, backend, and `MQTT` data
- deliver `local MP3` as the baseline media path
- treat `Spotify` and `Google Assistant` as bonus integrations

Current implementation reality:

- backend media, library, and recent-log reads are already wired over HTTP
- local MP3 playback already works in the browser through the backend stream endpoint
- the next missing baseline piece is the real `Home Assistant` telemetry adapter and contract freeze

## Key Documents

- Master plan: [MASTER-PLAN.md](./MASTER-PLAN.md)
- Detailed architecture plan: [docs/idea/master-plan.md](../docs/idea/master-plan.md)
- Frontend implementation plan: [docs/idea/frontend-implementation-plan.md](../docs/idea/frontend-implementation-plan.md)
- Progress tracker: [docs/progress.md](../docs/progress.md)
- Prioritized requirements: [docs/requirements.txt](../docs/requirements.txt)

## Current Frontend Direction

- Left panel: mixer and effects controls
- Center: vinyl player hero area
- Right panel: songs, playlists, and source-related controls
- Lower technical layer: `Telemetry Deck` for monitoring, logging, MQTT, and ESP32 health

## Local Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run test
npm run lint
npm run build
```

### Real Home Assistant Telemetry

The frontend now uses a real `Home Assistant` REST + WebSocket transport when these env vars are present:

```bash
VITE_HA_BASE_URL=http://127.0.0.1:8123
VITE_HA_TOKEN=your_long_lived_access_token
```

Optional:

```bash
VITE_HA_WEBSOCKET_URL=ws://127.0.0.1:8123/api/websocket
VITE_HA_LOGBOOK_HOURS=6
VITE_HA_EVENT_LOG_LIMIT=12
VITE_HA_MODE=mock
```

If HA env is missing, the app falls back to the existing mock telemetry transport.

For browser access from `Vite`, `Home Assistant` must allow the frontend origin through `http.cors_allowed_origins`.
