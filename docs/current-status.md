# HAJukeBox: Co Máme A Co Zbývá

Last updated: 2026-04-19

## Zdroje

Tento souhrn vychází z těchto dokumentů:

- `README.md`
- `docs/progress.md`
- `docs/requirements.txt`
- `docs/idea/master-plan.md`
- `backend/README.md`
- `backend/TODO.md`
- `homeassistant/README.md`
- `homeassistant/TODO.md`
- `esp/README.md`

## Krátký závěr

Projekt už má hotový použitelný baseline skeleton:

- backend umí `Local MP3` katalog, media state, commandy, stream a runtime health
- frontend umí číst reálná backend data a přehrávat lokální MP3 v prohlížeči
- frontend umí číst reálnou `Home Assistant` telemetrii přes `REST + WebSocket`
- `homeassistant/` obsahuje verzovaný bridge scaffold pro media summary mirror, telemetry helpery a Google Assistant request entity
- `Home Assistant Cloud / Nabu Casa` voice path už byl reálně propojen s Google Home a spoken-command smoke test prošel
- `esp/` obsahuje baseline firmware pro `ESP32` telemetrii, mode LED a reálně ověřený experimentální `Local MP3` audio render přes `I2S`
- `Telemetry Deck` pokrývá prakticky všechny prioritní `P0` a většinu `P1/P2` prvků
- `Spotify` je implementované jako bonusová vrstva

Hlavní práce, která ještě zbývá, už není základní wiring. Zbývá hlavně:

1. dotáhnout finální baseline integraci `Home Assistant + MQTT + ESP32 + frontend`
2. stabilizovat demo-ready chování `Local MP3`
3. potvrdit end-to-end automace a logování na živé sestavě
4. zvolit a odzkoušet sdílený runtime setup pro `Home Assistant`, preferovaně přes Docker

Poznámka k aktuálnímu audio stavu:

- `Local MP3 -> backend -> MQTT state -> ESP32 -> I2S zesilovač -> reproduktor` bylo potvrzené na reálném HW
- hlasitost funguje
- jde o demo-ready MVP, ne o plně stabilní audio renderer
- v klidném prostředí hraje dobře, ale při rušení na `2.4 GHz` může krátce škytat

## Co Už Máme

### 1. Backend a Local MP3

Podle `README.md` a `backend/README.md` už máme:

- reálný lokální katalog
- `GET /api/media/state`
- `POST /api/media/command`
- `GET /api/library/tracks`
- `GET /api/library/tracks/:trackId/stream`
- `GET /api/library/playlists`
- `POST /api/library/rescan`
- `GET /api/logs/recent`
- runtime health endpoint

To pokrývá většinu `Phase 1: Local MP3 Contracted Slice`.

### 2. Frontend

Podle `docs/progress.md` už je hotové:

- `Telemetry Deck`
- MQTT live feed terminal
- system health monitor
- human-readable event log
- sensor-to-action traceability
- live distance graph
- presence confidence gauge
- clap counter
- DSP presets
- audio status strip
- provider, reducer a sdílený app state
- čtení reálných backend dat přes HTTP
- browser playback pro `Local MP3`
- reálný `Home Assistant` telemetry transport přes `REST + WebSocket`

### 3. Home Assistant a ESP32 scaffold

Podle `homeassistant/README.md`, `homeassistant/TODO.md` a `esp/README.md` už v repu existuje:

- `configuration.yaml` se základním `packages` a `scripts` loadem
- `jukebox_media_bridge.yaml` pro backend -> HA mirror přes `MQTT`
- `jukebox_frontend_telemetry.yaml` pro helper entity, které frontend umí číst
- `jukebox_google_assistant.yaml` pro request entity a voice feedback helpery
- baseline `ESP32` sketch pro `MQTT` senzory, device health a mode LED příkazy
- živě potvrzené `set_mode` příkazy z `Home Assistant` do `ESP32`
- živě potvrzený `jukebox/media/state` mirror do `ESP32` pro `Local MP3` audio start
- živě potvrzený `I2S` audio výstup z `ESP32`, aktuálně s limity Wi-Fi stability

### 4. Spotify bonus vrstva

Podle `backend/README.md`, `backend/TODO.md` a aktuální implementace:

- backend má Spotify auth/session/token/state/transfer/disconnect endpointy
- frontend už nepoužívá jen sketch-only Spotify stav
- lokální fallback pro `Local MP3` zůstává zachovaný
- automatizované testy a Playwright scaffolding existují, ale pořád chybí jeden reálný smoke s Premium účtem

## Stav Požadavků Z Dokumentace

### P0

- `MQTT live feed terminal` - hotovo
- `System health monitor` - hotovo
- `Human-readable event log` - hotovo
- `Sensor-to-action traceability` - hotovo

### P1

- `Dynamic track metadata with source badge` - částečně hotovo
- `Master volume control` - hotovo
- `Audio status strip` - hotovo
- `DSP sound profiles` - hotovo
- `Visualizer / VU meter` - hotovo

### P2

- `Live distance graph` - hotovo
- `Presence confidence gauge` - hotovo
- `Clap counter` - hotovo

### P3

- `Mode selector with descriptions` - odloženo
- `Voice trigger entry` - odloženo

## Co Ještě Zbývá Pro Baseline

Následující body jsou syntéza `docs/progress.md`, `README.md`, `backend/README.md`, `homeassistant/README.md` a `docs/idea/master-plan.md`.

### 1. Potvrdit finální runtime kontrakt `Home Assistant + MQTT + ESP32`

Ještě potřebujeme:

- potvrdit finální seznam HA entit používaných pro telemetrii
- potvrdit finální MQTT topic namespace pro živý provoz
- zapsat a zmrazit, které části integračního toku už jsou skutečně potvrzené na živé sestavě a které jsou stále jen best-effort

Poznámka:

- návrh HA entit, helperů a MQTT topiců už v repu existuje
- `docs/progress.md` správně vede živé potvrzení entity/topic kontraktu jako stále otevřený úkol

Prakticky:

- základní živý stack už potvrzený je
- zbývá ho spíš uklidit, popsat a zmrazit pro demo

### 2. Dotáhnout demo-ready stabilitu `Local MP3`

Podle `docs/progress.md` a `master-plan` ještě zbývá:

- zpřesnit browser playback sync
- doladit seek/progress/playback lifecycle proti reálnému audio elementu
- ověřit failure handling pro empty library, missing stream a odpojené závislosti

Tohle je důležité, protože `Local MP3` je stále hlavní povinná baseline cesta.

### 3. Uzavřít baseline integraci v `Home Assistant`

Podle `homeassistant/README.md` a `master-plan` ještě potřebujeme jasně doložit:

- že `MQTT` senzorová data opravdu chodí do `Home Assistant`
- že existují stabilní HA entity pro frontend
- že HA skripty opravdu spouštějí backend media commandy
- že je vidět alespoň jedna až dvě end-to-end automace
- že reálné automace generují čitelné logy

Tohle je hlavní podmínka, aby šel projekt obhájit jako `HA-centered`.

### 4. Zavřít `Phase 4: Baseline Integration Freeze`

Podle `docs/idea/master-plan.md` musí pro baseline platit:

- `Local MP3` playback funguje z UI
- `Telemetry Deck` ukazuje reálná senzorová a health data
- funguje alespoň jedna viditelná end-to-end automace
- existují raw i human-readable logy
- tým umí stručně vysvětlit architekturu

Podle přísnějšího `Baseline Definition Of Done` v master plánu navíc:

- fungují alespoň dvě sensor-driven automace

To je nejdůležitější zbývající integrační checkpoint.

## Co Zbývá Mimo Baseline

### Spotify

Spotify už není hlavní blocker, ale ještě zbývá:

- provést jeden manuální smoke test s reálným Spotify účtem

### Voice / Google Assistant

Google Assistant už má reálně ověřenou cloudovou slice:

- HA request entity
- HA automace, které překládají voice trigger na media skripty
- frontend feedback stav pro poslední voice command
- `Home Assistant Cloud / Nabu Casa` linking
- spoken-command smoke test
- dokumentovaný seznam přímých příkazů a doporučených rutin

Stále ale zbývá:

- případně přidat další Google Home personal routines pro přirozenější phrasing
- případně rozšířit voice surface o další akce nad rámec aktuálních osmi request entit

### P3 UX položky

Stále odložené:

- mode selector s popisy
- voice trigger entry v UI

## Doporučené Pořadí Další Práce

1. Ověřit živý `ESP32 -> MQTT -> HA -> frontend` tok a potvrdit finální entity/topic list.
2. Potvrdit sdílený `Home Assistant` runtime path:
   - preferovaně `Home Assistant Container` přes Docker
   - `VirtualBox` nechat jako fallback
3. Dokončit `Local MP3` playback sync a failure handling.
4. Ověřit alespoň jednu až dvě reálné HA automace včetně logů.
5. Udělat manuální Spotify smoke s reálným účtem.
6. Teprve potom řešit případné rozšíření `Google Assistant` a odložené `P3` UI položky.

## Praktická Odpověď Na Otázku "Co Nám Teď Zbývá?"

Pokud to zkrátíme na minimum, zbývá hlavně toto:

- finálně potvrdit reálný `HA/MQTT/ESP32` kontrakt
- potvrdit sdílený `Home Assistant` runtime setup pro tým
- doladit demo stabilitu `Local MP3`
- ověřit živé automace a logy
- udělat poslední manuální Spotify smoke

Všechno ostatní už je buď hotové, nebo je to bonus mimo baseline.
