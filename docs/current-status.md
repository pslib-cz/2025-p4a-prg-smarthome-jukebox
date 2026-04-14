# HAJukeBox: Co Máme A Co Zbývá

Last updated: 2026-04-14

## Zdroje

Tento souhrn vychází z těchto dokumentů:

- `README.md`
- `docs/progress.md`
- `docs/requirements.txt`
- `docs/idea/master-plan.md`
- `backend/README.md`
- `homeassistant/README.md`
- `openspec/changes/*/tasks.md`

## Krátký závěr

Projekt už má hotový použitelný baseline skeleton:

- backend umí `Local MP3` katalog, media state, commandy, stream a runtime health
- frontend umí číst reálná backend data a přehrávat lokální MP3 v prohlížeči
- frontend umí číst reálnou `Home Assistant` telemetrii přes `REST + WebSocket`
- `Telemetry Deck` pokrývá prakticky všechny prioritní `P0` a většinu `P1/P2` prvků
- `Spotify` je implementované jako bonusová vrstva

Hlavní práce, která ještě zbývá, už není základní wiring. Zbývá hlavně:

1. dotáhnout finální baseline integraci `Home Assistant + MQTT + ESP32 + frontend`
2. stabilizovat demo-ready chování `Local MP3`
3. potvrdit end-to-end automace a logování na živé sestavě
4. uzavřít dokumentační nesoulady mezi `progress`, `master-plan` a `openspec`

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

### 3. OpenSpec změny

Podle `openspec` checklistů jsou hotové:

- `freeze-backend-media-contract` - vše hotovo
- `freeze-home-assistant-media-bridge` - vše hotovo
- `freeze-spotify-web-playback` - vše hotovo kromě jednoho manuálního smoke testu s reálným Spotify účtem

### 4. Spotify bonus vrstva

Podle `backend/README.md`, `openspec` a aktuální implementace:

- backend má Spotify auth/session/token/state/transfer/disconnect endpointy
- frontend už nepoužívá jen sketch-only Spotify stav
- lokální fallback pro `Local MP3` zůstává zachovaný
- automatizované `curl` a Playwright ověření existuje

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
- potvrdit, že `ESP32 -> MQTT -> Home Assistant -> frontend` funguje na reálné sestavě, ne jen na fake/mock datech

Poznámka:

- `openspec` říká, že kontrakt je zmrazený pro media bridge
- `docs/progress.md` ale stále vede freeze HA entity/topic kontraktu jako živý úkol

Prakticky to znamená, že návrh už existuje, ale chybí finální potvrzení na živém stacku a sjednocení dokumentace.

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

To je jediný otevřený checkbox v `openspec/changes/freeze-spotify-web-playback/tasks.md`.

### Voice / Google Assistant

Google Assistant už má první lokální implementační slice:

- HA request entity
- HA automace, které překládají voice trigger na media skripty
- frontend feedback stav pro poslední voice command

Stále ale zbývá:

- propojit reálný Google Home / Google Assistant cloud path
- udělat jeden manuální spoken-command smoke

### P3 UX položky

Stále odložené:

- mode selector s popisy
- voice trigger entry v UI

## Dokumentační Nesoulady

Dokumentace dnes není úplně zarovnaná:

1. `openspec` vede backend media contract i HA media bridge jako dokončené
2. `docs/progress.md` stále vede část HA kontraktu a backend/HA alignments jako rozpracované
3. `README.md` stále mluví o `backend <-> HA bridge` jako o hlavním blockeru, i když část už je implementovaná
4. Spotify je v `openspec` skoro uzavřené, ale některé starší dokumenty ho ještě popisují jako budoucí vrstvu

To znamená, že další rozumný krok není jen programování, ale i srovnání dokumentace na jednu pravdu.

## Doporučené Pořadí Další Práce

1. Ověřit živý `ESP32 -> MQTT -> HA -> frontend` tok a potvrdit finální entity/topic list.
2. Dokončit `Local MP3` playback sync a failure handling.
3. Ověřit alespoň jednu až dvě reálné HA automace včetně logů.
4. Přepsat `docs/progress.md` a `README.md`, aby odpovídaly aktuálnímu stavu po `openspec` implementacích.
5. Udělat manuální Spotify smoke s reálným účtem.
6. Teprve potom řešit `Google Assistant` a odložené `P3` UI položky.

## Praktická Odpověď Na Otázku "Co Nám Teď Zbývá?"

Pokud to zkrátíme na minimum, zbývá hlavně toto:

- finálně potvrdit reálný `HA/MQTT/ESP32` kontrakt
- doladit demo stabilitu `Local MP3`
- ověřit živé automace a logy
- uklidit dokumentaci
- udělat poslední manuální Spotify smoke
- udělat poslední manuální Google Assistant smoke

Všechno ostatní už je buď hotové, nebo je to bonus mimo baseline.
