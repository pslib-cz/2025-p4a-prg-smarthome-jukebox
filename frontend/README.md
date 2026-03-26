# HAJukeBox Frontend Sketch

Stylized frontend prototype for a smart jukebox project built with `React`, `TypeScript`, and `Vite`.

The current repository focus is:
- preserve the music-console visual identity
- prepare the UI for real `Home Assistant`, backend, and `MQTT` data
- deliver `local MP3` as the baseline media path
- treat `Spotify` and `Google Assistant` as bonus integrations

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
