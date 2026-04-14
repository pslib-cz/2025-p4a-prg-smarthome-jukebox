Place or symlink your real music library here for Docker-based runs.

Recommended options:

- symlink `runtime/music` to a real host music directory
- or keep `MUSIC_LIBRARY_PATH` pointing somewhere else in `compose.yaml` via `.env`

To make the backend use this mounted folder in Docker, set:

```bash
MEDIA_LIBRARY_PATH=/music
```

If `MEDIA_LIBRARY_PATH` is left empty, the backend falls back to the bundled mock library.
