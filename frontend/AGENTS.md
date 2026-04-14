# HAJukeBox Working Notes

## Scope
- This repository is currently a frontend-only visual prototype.
- The UI does not need to be functionally complete yet.
- Design quality, visual cohesion, and intentional interaction feel take priority over real integrations.

## Current Direction
- Treat the current implementation as the source of truth for the product direction.
- The project is a stylized music player / DJ console, not a smart-home telemetry dashboard.
- Preserve the current three-column composition:
  - left: mixer / effects controls
  - center: vinyl player hero area
  - right: songs / playlists / Spotify panel

## Theme Language
- **Casual** (default): warm latte / coffee palette — cozy and inviting.
- **Disco**: neon / purple glow — energetic nightlife feel with sparkle particles.
- **Focus**: deep navy / teal — calm concentration colors.
- **Eco**: natural greens — earth, forest, organic feel.
- Only colors and accent glows change between themes; layout and structure stay the same.
- Favor tactile controls, panel structure, soft shadows, rounded geometry, and atmospheric lighting.

## Design Priorities
- Keep the vinyl record as the visual anchor.
- Prefer UI that feels like a music device or console, not a generic dashboard.
- Avoid adding backend-looking widgets unless they clearly support the music-player identity.
- When tuning the interface, improve hierarchy, spacing, typography, and interaction polish before adding more features.

## Historical Context
- `text.txt` contains an older AI conversation and an earlier smart dashboard concept.
- Use it only as background inspiration, not as a strict specification.
- If `text.txt` conflicts with the current UI, prefer the current UI.

## Implementation Constraints
- Keep files focused and under 500 lines when possible.
- Write code and comments in English.
- Only add comments where the intent is not obvious from the code.
- Add tests only when logic is introduced or changed in a meaningful way.
