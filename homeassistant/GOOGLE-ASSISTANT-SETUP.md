# Google Assistant Setup

This is the shortest practical path for linking the checked-in `HAJukeBox`
Google request entities to a real Google Assistant / Google Home account.

Use this only after the local stack is already stable.

## What is already implemented in the repo

Home Assistant already ships:

- `input_button` request entities for media transport commands
- `input_button` request entities for `focus`, `party`, `eco`, and `idle`
- automations that translate those requests into existing `HAJukeBox` scripts
- helper entities that store the last voice source, command, and response

Relevant files:

- `packages/jukebox_google_assistant.yaml`
- `google_assistant.example.yaml`

## Important constraint

Pure local Docker access on `http://127.0.0.1:8123` is not enough for the
Google cloud-linking step.

For this repository, the preferred path is `Home Assistant Cloud / Nabu Casa`.
That path avoids the manual Google Developer Console setup and is the easiest
way to reach a real spoken-command smoke test.

## Recommended project path

For this school project, keep the scope narrow:

1. Expose only the prepared `input_button` request entities.
2. Link Home Assistant to Google Home.
3. Run one spoken smoke test such as play, next, or focus mode.
4. Verify that the voice helper entities update in Home Assistant and in the frontend.

Current repo status:

- preferred voice path: `Home Assistant Cloud / Nabu Casa`
- manual Google Developer Console setup: documented as a fallback only
- real cloud-linked smoke test: completed on `2026-04-18`

## Preferred path: Home Assistant Cloud

### 1. Enable Home Assistant Cloud

In Home Assistant:

1. Open `Settings -> Home Assistant Cloud`.
2. Sign in to `Nabu Casa` or start the trial.
3. Wait until Home Assistant Cloud reports that it is reachable.

The repository root config explicitly enables `cloud:` because this project uses
a minimal `configuration.yaml` instead of `default_config:`.

### 2. Enable Google Assistant in Home Assistant Cloud

In Home Assistant:

1. Open `Settings -> Voice assistants`.
2. Open `Google Assistant`.
3. Turn it on.
4. Keep only the prepared `HAJukeBox` request entities exposed.

The repository already pins the Nabu Casa Google exposure in
`homeassistant/configuration.yaml` to these eight `input_button` entities:

- `input_button.hajukebox_google_play_request`
- `input_button.hajukebox_google_pause_request`
- `input_button.hajukebox_google_next_request`
- `input_button.hajukebox_google_previous_request`
- `input_button.hajukebox_google_focus_mode_request`
- `input_button.hajukebox_google_party_mode_request`
- `input_button.hajukebox_google_eco_mode_request`
- `input_button.hajukebox_google_idle_mode_request`

### 3. Link Home Assistant Cloud in Google Home

In the Google Home app:

1. Open `Devices`.
2. Tap `+ Add`.
3. Choose `Works with Google Home`.
4. Find `Home Assistant Cloud by Nabu Casa`.
5. Log into Nabu Casa in the browser window that opens.
6. Finish linking.

If Google does not see the new entities, say:

- `Hey Google, sync my devices`

### 4. Run the smoke test

Use one of these:

- `Hey Google, activate HAJukeBox Play Music`
- `Hey Google, activate HAJukeBox Next Track`
- `Hey Google, activate HAJukeBox Focus Mode`
- `Hey Google, activate HAJukeBox Party Mode`

### 5. Verify in Home Assistant

Check that these entities update:

- `input_text.hajukebox_last_voice_source`
- `input_text.hajukebox_last_voice_command`
- `input_text.hajukebox_last_voice_response`

Also verify that the corresponding backend or mode action happened.

### 6. Verify in the frontend

Open the frontend telemetry view and confirm that the latest voice command is visible.

## Manual fallback path

Use this only if the team later decides to replace `Home Assistant Cloud` with a
fully self-managed setup.

### 1. Make Home Assistant externally reachable

You need one real public HTTPS URL for Home Assistant, for example:

- reverse proxy with a public domain
- another secure public HTTPS path of your choice

Before continuing, verify this works from outside your LAN:

- `https://your-domain.example`

### 2. Prepare the Google Home Developer project

1. Open the Google Home Developer Console.
2. Create a new project.
3. Add a `Cloud-to-Cloud` integration.
4. Save the generated `project_id`.

Use these values in the integration setup:

- OAuth Client ID:
  `https://oauth-redirect.googleusercontent.com/r/YOUR_PROJECT_ID`
- Authorization URL:
  `https://YOUR_PUBLIC_HA_DOMAIN/auth/authorize`
- Token URL:
  `https://YOUR_PUBLIC_HA_DOMAIN/auth/token`
- Cloud fulfillment URL:
  `https://YOUR_PUBLIC_HA_DOMAIN/api/google_assistant`
- Scopes:
  `email`
  `name`

For the `Client Secret`, Home Assistant docs state any simple string is acceptable.

### 3. Create the Google service account JSON

1. Create a service account.
2. Grant it `Service Account Token Creator`.
3. Create a JSON private key.
4. Rename the downloaded file to `SERVICE_ACCOUNT.json`.

Then place it into your live Home Assistant config directory:

- `runtime/homeassistant/config/SERVICE_ACCOUNT.json`

Do not commit this file.

### 4. Enable the required Google API

In Google Cloud for the same project:

1. Search for `HomeGraph API`.
2. Enable it.

### 5. Add the Home Assistant YAML block

Copy the checked-in example into your live Home Assistant configuration:

- source: `homeassistant/google_assistant.example.yaml`

Add it either:

- directly into `runtime/homeassistant/config/configuration.yaml`
- or include it from a private file such as `google_assistant.yaml`

### 6. Restart Home Assistant

1. Check configuration.
2. Restart Home Assistant.

## Expected spoken-command mapping

- `Play Music` -> `script.hajukebox_play`
- `Pause Music` -> `script.hajukebox_pause`
- `Next Track` -> `script.hajukebox_next`
- `Previous Track` -> `script.hajukebox_previous`
- `Focus Mode` -> `script.hajukebox_set_mode(mode=focus)`
- `Party Mode` -> `script.hajukebox_set_mode(mode=party)`
- `Eco Mode` -> `script.hajukebox_set_mode(mode=eco)`
- `Idle Mode` -> `script.hajukebox_set_mode(mode=idle)`

## Voice command reference

The most reliable direct phrases are the explicit scene-style commands:

- `Hey Google, activate HAJukeBox Play Music`
- `Hey Google, activate HAJukeBox Pause Music`
- `Hey Google, activate HAJukeBox Next Track`
- `Hey Google, activate HAJukeBox Previous Track`
- `Hey Google, activate HAJukeBox Focus Mode`
- `Hey Google, activate HAJukeBox Party Mode`
- `Hey Google, activate HAJukeBox Eco Mode`
- `Hey Google, activate HAJukeBox Idle Mode`

Recommended Google Home personal-routine phrases:

- `play music on jukebox` -> `activate HAJukeBox Play Music`
- `pause jukebox` -> `activate HAJukeBox Pause Music`
- `next song on jukebox` -> `activate HAJukeBox Next Track`
- `previous song on jukebox` -> `activate HAJukeBox Previous Track`
- `focus mode on jukebox` -> `activate HAJukeBox Focus Mode`
- `party mode on jukebox` -> `activate HAJukeBox Party Mode`
- `eco mode on jukebox` -> `activate HAJukeBox Eco Mode`
- `idle mode on jukebox` -> `activate HAJukeBox Idle Mode`

Suggested Czech personal-routine phrases:

- `pust hudbu na jukeboxu` -> `activate HAJukeBox Play Music`
- `pauzni jukebox` -> `activate HAJukeBox Pause Music`
- `dalsi skladba na jukeboxu` -> `activate HAJukeBox Next Track`
- `predchozi skladba na jukeboxu` -> `activate HAJukeBox Previous Track`
- `prepni jukebox na focus` -> `activate HAJukeBox Focus Mode`

Current limits:

- `input_button` entities are exposed as scene-like triggers, so bare phrases such as `play music on jukebox` are not guaranteed without a personal routine
- the exposed entities may sync for voice control but still not appear as normal device tiles in the Google Home grid
- for demos, treat English as the baseline and Czech as a mobile-only best-effort layer

## Troubleshooting

- If linking fails, recheck that your public URL is reachable and valid over HTTPS.
- If Google says it cannot sync devices, say `sync my devices` again or relink the test app.
- If the entities do not show up, keep `expose_by_default: false` and expose only the prepared `input_button` entities first.
- If the voice command reaches Home Assistant but nothing plays, inspect the automation trace for `jukebox_google_assistant.yaml`.

## Official docs

- Home Assistant Google Assistant integration:
  https://www.home-assistant.io/integrations/google_assistant/
- Home Assistant Google Assistant SDK:
  https://www.home-assistant.io/integrations/google_assistant_sdk
