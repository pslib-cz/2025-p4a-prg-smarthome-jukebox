# HAJukeBox Design Context

## What The Prototype Is
HAJukeBox is currently a mood-driven frontend sketch for a music player experience. It behaves like a compact DJ desk: tactile controls on the left, a vinyl-centered playback hero in the middle, and browsing/library actions on the right.

This is intentionally a design prototype first. Presentational quality matters more than real playback, API wiring, or production behavior.

## Current Visual Identity
- Core metaphor: DJ console + modern music app.
- Layout: fixed three-column desktop composition.
- Main mood: warm, creamy, coffee-toned light theme.
- Alternate mood: neon disco theme with particles, glow, and purple-pink accents.
- Primary visual centerpiece: spinning vinyl with a circular simulated visualizer.

## Current UI Structure
### Left Panel
- `Mixer` and `Effects` tabs.
- Vertical faders for volume, bass, and treble.
- Horizontal sliders for effect values.
- The panel reads like hardware-inspired control surfaces.

### Center Area
- Large vinyl record with album art in the center label.
- Simulated circular audio visualizer behind the vinyl.
- Song metadata below the player.
- Minimal playback transport with previous, play/pause, and next.
- Simple draggable progress bar.

### Right Panel
- Music section header with theme toggle.
- Tabs for `Songs` and `Playlists`.
- Scrollable song list with active-state cover overlay.
- Simple playlist cards and a fake create-playlist action.
- Spotify connect button used as a visual CTA, not a real integration.

## Important State Assumptions
- Current app data flows through the shared provider and mock data source in `frontend/src/state/`.
- Important media and telemetry state no longer lives only in `src/App.tsx`.
- Some purely presentational interactions still use local component state.
- Spotify connection, songs, progress, and playlist content are placeholders.
- The prototype should feel believable without becoming functionally complex too early.

## Reading `text.txt`
`text.txt` describes an older concept focused on telemetry, presence sensors, modes, and smart-device control. That document is useful only as historical background.

Current priority is not to force those ideas into the UI. The existing design direction is stronger when treated as a music-first interface.

## Tuning Principles For Next Iterations
- Keep the vinyl hero dominant.
- Improve spacing and rhythm before adding new sections.
- Preserve the warm/disco duality instead of drifting into a third unrelated style.
- If new elements are added, make them feel like parts of a music console.
- Favor stronger typography and more deliberate micro-details over feature sprawl.

## Likely Next Tuning Areas
- Responsive behavior for smaller laptop and mobile widths.
- Stronger typographic hierarchy in side panels.
- Better spacing consistency between controls, tabs, and list rows.
- More intentional empty-state treatment in the playlists view.
- Refinement of the theme toggle and panel depth.
