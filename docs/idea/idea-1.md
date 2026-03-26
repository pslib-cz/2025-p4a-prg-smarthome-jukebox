# Historical Draft - Archived

This file is intentionally kept only as an archive placeholder.

The original brainstorming content was based on an older architecture and is no longer valid for implementation.

Do not use this file for planning or setup.

Use these documents instead:

- `/README.md`
- `/backend/README.md`
- `/homeassistant/README.md`
- `/frontend/sketch/MASTER-PLAN.md`
- `/docs/idea/master-plan.md`
- `/docs/assignment/assignment.md`

Current architecture summary:

- `Home Assistant` is the central automation runtime
- `backend/` owns media state and playback coordination
- `frontend/sketch/` is the dashboard client
- `ESP32` provides telemetry and hardware I/O over `MQTT`
