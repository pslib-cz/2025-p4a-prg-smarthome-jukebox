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
- Nastavení `Home Assistant`: [homeassistant/SETUP-VIRTUALBOX.md](./homeassistant/SETUP-VIRTUALBOX.md)
- Seznam úkolů `Home Assistant`: [homeassistant/TODO.md](./homeassistant/TODO.md)
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
- `frontend/` už čte reálná backend data přes HTTP a umí přehrávat lokální MP3 v prohlížeči přes backend stream
- hlavní baseline blocker už není samotný frontend-backend wiring, ale zafixování `Home Assistant` kontraktu, `MQTT` topiců a backend <-> HA bridge
- křížové backend a kontraktové změny je vhodné vést přes `OpenSpec` artefakty v `openspec/changes/`

## Doporučené pořadí realizace

1. Zafixovat kontrakty:
   - backend media API
   - `Home Assistant` entity
   - `MQTT` topic namespace
2. Stabilizovat `Local MP3` vertical slice:
   - backend katalog + commandy + stream endpoint
   - frontend browser playback + sync stavu
3. Napojit frontend na reálnou telemetrii z `HA`
4. Dokončit backend <-> `Home Assistant` bridge pro mediální příkazy a summary mirror
5. Stabilizovat základní demo flow a failure handling
6. Přidat realtime vrstvu jen pokud polling přestane stačit
7. Zkusit `Spotify`
8. Zkusit `Google Assistant`

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
