# HAJukeBox

HAJukeBox je lokální projekt chytrého jukeboxu postavený kolem `Home Assistant`, jednoho uzlu `ESP32`, vlastního mediálního backendu a samostatného frontendového dashboardu.

Směr projektu je nyní zafixovaný do jedné architektury:

- `Home Assistant` je centrální runtime pro automatizaci a monitoring
- `backend/` vlastní stav médií a orchestrace přehrávání pro `Local MP3` a později `Spotify`
- `frontend/` je hlavní uživatelský dashboard
- `ESP32` publikuje telemetrii senzorů a zařízení přes `MQTT`

`Music Assistant` už není součástí základní architektury. Pokud byl nainstalovaný jen kvůli experimentům, berte ho jako dočasný a odstraňte ho, aby nevznikal zmatek.

## Hlavní vstupní body repozitáře

- Frontendový prototyp: [frontend/README.md](./frontend/README.md)
- Frontendový souhrnný plán: [frontend/MASTER-PLAN.md](./frontend/MASTER-PLAN.md)
- Hlavní architektonický plán: [docs/idea/master-plan.md](./docs/idea/master-plan.md)
- Rozsah backendu: [backend/README.md](./backend/README.md)
- Seznam úkolů backendu: [backend/TODO.md](./backend/TODO.md)
- Rozsah `Home Assistant`: [homeassistant/README.md](./homeassistant/README.md)
- Doporučené nastavení `Home Assistant` přes Docker: [homeassistant/SETUP-DOCKER.md](./homeassistant/SETUP-DOCKER.md)
- Alternativní nastavení `Home Assistant` přes VirtualBox: [homeassistant/SETUP-VIRTUALBOX.md](./homeassistant/SETUP-VIRTUALBOX.md)
- Seznam úkolů `Home Assistant`: [homeassistant/TODO.md](./homeassistant/TODO.md)
- ESP32 firmware baseline: [esp/README.md](./esp/README.md)
- Zadání předmětu: [docs/assignment/assignment.md](./docs/assignment/assignment.md)

## Zvolená architektura

### Home Assistant

Vlastní:

- logiku automatizací
- stav místnosti a zařízení
- model entit pro monitoring a ovládání
- příjem `MQTT`
- skripty a automatizace

Nevlastní:

- indexaci lokálního katalogu médií
- správu `Spotify` autentizace a session
- čistě frontendový UI stav

### Vlastní backend

Vlastní:

- lokální `MP3` katalog a stav přehrávání
- zpracování mediálních příkazů
- později správu `Spotify` autentizace a session
- mediální API pro frontend
- propojení mediálního stavu do `Home Assistant`

Nevlastní:

- logiku přítomnosti
- automatizace režimů
- primární pravdu o surové telemetrii z `ESP32`

### Frontend

Vlastní:

- UI dashboardu
- mediální ovládání
- prezentaci telemetrie
- logy a monitorovací pohledy

Čte:

- `Home Assistant` pro automatizace, telemetrii a stav entit
- `backend/` pro knihovnu médií, stav přehrávání a mediální příkazy

### ESP32

Vlastní:

- detekci tlesknutí a vzdálenosti
- hlášení stavu
- akce na úrovni hardwaru

Sám nerozhoduje o chování systému na vyšší úrovni.

## Soulad se zadáním pro 3 lidi

Zadání předmětu pro `N = 3` vyžaduje:

- alespoň `2` lokální HA integrace
- alespoň `3` scénáře
- alespoň `6` entit

Doporučený základní plán pro splnění:

- lokální integrace:
  - `MQTT`
  - jedna další lokální integrace v `Home Assistant`, doporučeně `Ping`
- minimální scénáře:
  - `Focus`
  - `Party`
  - `Eco / Presence`
- minimální entity:
  - distance
  - clap count
  - RSSI
  - uptime
  - mode
  - zdroj médií nebo stav médií

Důležitá interpretace:

- `Home Assistant` musí zůstat centrálním runtime viditelným v architektuře
- vlastní backend je lokální mediální subsystém uvnitř stejného projektu, ne cloudová závislost
- neschovávejte pravdu o místnosti ani automatizacích za backend
- při přísné interpretaci hodnocení musí být důležitý stav médií a příkazy stále zrcadlené do `Home Assistant`

## Priority dodávky

### Základ

- `Local MP3`
- `Home Assistant`
- `MQTT`
- `ESP32`
- reálná telemetrie ve frontendu

### Bonus

- `Spotify Web Playback SDK`
- `Google Assistant`

## Aktuální stav repa

- `backend/` už vrací reálný lokální katalog, media state, media commandy, recent logy a stream endpoint pro jednotlivé tracky
- `backend/` už obsahuje i první `Home Assistant` MQTT mirror scaffold a bonusové `Spotify` auth/session endpointy
- `frontend/` už čte reálná backend data přes HTTP, umí přehrávat lokální MP3 v prohlížeči přes backend stream a umí použít reálnou `Home Assistant` telemetrii přes `REST + WebSocket`
- `homeassistant/` už obsahuje verzovaný config scaffold pro media bridge, frontend telemetry helpery a `Google Assistant` request entity
- `esp/` už obsahuje baseline `ESP32` firmware pro `MQTT` telemetrii, odběr mediálních příkazů a mode LED signalizaci
- hlavní baseline blocker už není chybějící scaffolding, ale živé ověření a hardening celé cesty `ESP32 -> MQTT -> Home Assistant -> frontend` a `Home Assistant -> backend`

## Aktuální Docker Smoke Test

Ověřeno dne `2026-04-14` ve `WSL2 + Docker Desktop`:

- `Home Assistant`: `http://127.0.0.1:8123`
- `frontend`: `http://127.0.0.1:5173`
- `backend`: `http://127.0.0.1:3000`
- `MQTT broker`: `127.0.0.1:1883`

Poznámky k tomuto runtime:

- první pull image `Home Assistant` je velký a může trvat několik minut
- reálná hudba v Dockeru funguje přes bind mount host složky do `/music`
- `ESP32` se po Wi‑Fi nepřipojuje na Docker service name `mqtt`, ale na LAN IP adresu hostitelského stroje
- detailní fyzické zapojení a Wi‑Fi onboarding jsou v [esp/README.md](./esp/README.md)

## Doporučené pořadí realizace

1. Zafixovat kontrakty:
   - backend media API
   - `Home Assistant` entity
   - `MQTT` topic namespace
2. Stabilizovat `Local MP3` vertical slice:
   - backend katalog + commandy + stream endpoint
   - frontend browser playback + sync stavu
3. Ověřit živou `Home Assistant` instanci na sdíleném runtime:
   - preferovaně `Home Assistant Container` přes Docker
   - `VirtualBox` držet jako fallback
4. Potvrdit end-to-end cestu:
   - `ESP32 -> MQTT -> Home Assistant -> frontend`
   - `Home Assistant -> backend` media commandy
5. Stabilizovat základní demo flow a failure handling
6. Přidat realtime vrstvu jen pokud polling přestane stačit
7. Udělat jeden reálný `Spotify` smoke test
8. Udělat jeden reálný `Google Assistant` smoke test

## Rozdělení týmu

### Student A

- frontendový dashboard
- UI médií
- telemetrická vrstva
- napojení adaptérů

### Student B

- backendová mediální služba
- stav a příkazy pro `Local MP3`
- později integrace `Spotify`
- mediální propojení do `Home Assistant`

### Student C

- `Home Assistant`
- firmware pro `ESP32`
- senzory
- hardwarová cesta
- publikování do `MQTT`
- automatizace
- entity

## Aktuální pravidlo

Hlavní pracovní architektonický dokument je [docs/idea/master-plan.md](./docs/idea/master-plan.md).

Zadání předmětu v [docs/assignment/assignment.md](./docs/assignment/assignment.md) zůstává externím omezením kvůli souladu s hodnocením.

Doménové dokumenty níže používejte jen jako rozšíření master plánu, ne jako jeho náhradu:

1. [backend/README.md](./backend/README.md)
2. [homeassistant/README.md](./homeassistant/README.md)
3. [frontend/MASTER-PLAN.md](./frontend/MASTER-PLAN.md)
