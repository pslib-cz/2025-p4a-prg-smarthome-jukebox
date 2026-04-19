# ESP firmware (Arduino IDE)

`esp/smarthome_jukebox_esp/smarthome_jukebox_esp.ino` je připravený baseline firmware pro `ESP32` podle projektového MQTT kontraktu.

## Co firmware dělá

- připojení na Wi-Fi a MQTT
- publikace telemetrie:
  - vzdálenost (`HC-SR04`)
  - clap counter (digitální clap senzor)
  - mic level (analog)
  - RSSI
  - uptime
  - health/status + system events
- odběr mediálních příkazů z `jukebox/media/command`
- odběr mediálního stavu z `jukebox/media/state`
- experimentální přehrání `Local MP3` z backend streamu přes `I2S`
- dočasný `I2S` test tone režim pro rychlé ověření zesilovače a reproduktoru
- heartbeat LED (indikace běhu firmware)

## Arduino IDE 2.x setup

1. Nainstaluj `Arduino IDE 2.x`.
2. Otevři **File -> Preferences**.
3. Do **Additional boards manager URLs** přidej:
   - `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
4. Otevři **Tools -> Board -> Boards Manager** a nainstaluj:
   - `esp32 by Espressif Systems`
5. Otevři **Sketch -> Include Library -> Manage Libraries** a nainstaluj:
   - `PubSubClient`
   - `Adafruit NeoPixel`
   - `ESP8266Audio`
6. Otevři sketch:
   - `esp/smarthome_jukebox_esp/smarthome_jukebox_esp.ino`
7. Zkontroluj nebo doplň v horní části sketch:
   - `WIFI_SSID`, `WIFI_PASSWORD`
   - `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`
   - `BACKEND_HOST`, `BACKEND_PORT`
   - `ENABLE_I2S_TEST_TONE`
   - `TEST_TONE_FREQUENCY_HZ`
   - `TEST_TONE_VOLUME_PERCENT`
8. Připoj `ESP32` přes `USB`.
9. Nastav desku a port:
   - **Tools -> Board -> ESP32 Arduino -> ESP32 Dev Module**
   - **Tools -> Port -> COMx**
10. Klikni na **Verify**.
11. Klikni na **Upload**.
12. Pokud se upload zasekne na `Connecting...`, podrž na desce tlačítko `BOOT`, dokud nezačne nahrávání.
13. Otevři **Tools -> Serial Monitor** a nastav `115200 baud`.
14. Po bootu sleduj:
   - `SmartHome Jukebox ESP32 boot`
   - `I2S test tone enabled: 440 Hz @ 18%`
   - `Audio test tone started: 440 Hz @ 18%`

### Troubleshooting kompilace

Pokud Arduino IDE hlásí chybu `LED_BUILTIN was not declared`, aktuální sketch už má fallback:

- `#ifndef LED_BUILTIN`
- `#define LED_BUILTIN 2`

Takže stačí používat poslední verzi souboru `smarthome_jukebox_esp.ino`.

## Aktuální piny (podle tvého zapojení)

- `PIN_ULTRASONIC_TRIG = 5`
- `PIN_ULTRASONIC_ECHO = 18`
- `PIN_MIC_ANALOG = 32` (mikrofon OUT)
- `PIN_I2S_DIN = 22`
- `PIN_I2S_BCLK = 26`
- `PIN_I2S_LRC = 25`
- `PIN_I2S_SD = 21`
- `PIN_MODE_LED_DATA = 27` (datový pin pro LED pásek)
- `PIN_LED_STATUS = LED_BUILTIN`

Poznámka: clap detekce běží z analogové hodnoty mikrofonu na `D32` přes práh `MIC_CLAP_THRESHOLD`.

## Rychlý pinout pro aktuální baseline

Pokud chceš jen rychle zapojit aktuální funkční baseline, drž se tohoto:

- `HC-SR04 VCC -> 5V/VIN`
- `HC-SR04 GND -> GND`
- `HC-SR04 TRIG -> GPIO5`
- `HC-SR04 ECHO -> GPIO18` přes převod `5V -> 3.3V`
- `MIC VCC -> 3.3V`
- `MIC GND -> GND`
- `MIC OUT -> GPIO32`
- `WS2812 / NeoPixel 5V -> 5V`
- `WS2812 / NeoPixel GND -> GND`
- `WS2812 / NeoPixel DIN -> GPIO27` přes `330-500 Ohm`
- stavová LED na desce: `LED_BUILTIN`, typicky `GPIO2` na běžném `ESP32 Dev Module`

Piny pro audio výstup:

- `GPIO22 -> I2S DIN`
- `GPIO26 -> I2S BCLK`
- `GPIO25 -> I2S LRC / WS`
- `GPIO21 -> AMP SD / EN`
- `reproduktor -> pouze do výstupu zesilovače (SPK+ / SPK-)`

Rychlá bezpečnostní pravidla:

- všechny moduly musí mít společnou `GND`
- `HC-SR04 ECHO` nikdy nevoď přímo do `ESP32`, pokud z něj leze `5V`
- `WS2812` napájej z `5V`, ne z `3.3V`

## Doporučené fyzické zapojení

Aktuální firmware opravdu používá:

- `HC-SR04`
- analogový mikrofonní modul s `OUT`
- stavovou LED na desce
- `WS2812` / `NeoPixel` mode LED pásek nebo ring

`I2S` piny už může firmware použít i pro experimentální `Local MP3` přehrávání z backendu. Není to plnohodnotný player, ale MVP renderer pro školní demo.

### Bezpečné minimum

| Funkce | ESP32 pin | Druhá strana | Poznámka |
| --- | --- | --- | --- |
| Ultrasonic `TRIG` | `GPIO5` | `HC-SR04 TRIG` | Přímé spojení |
| Ultrasonic `ECHO` | `GPIO18` | `HC-SR04 ECHO` | Vést přes dělič napětí nebo level shifter |
| Mic analog | `GPIO32` | `MIC OUT` | Jen pokud modul dává max `3.3 V` |
| Mode LED data | `GPIO27` | `WS2812 DIN` | Přes `330-500 Ohm` rezistor co nejblíž k první LED |
| I2S data | `GPIO22` | `I2S DIN` | Aktivně použité pro audio stream |
| I2S bit clock | `GPIO26` | `I2S BCLK` | Aktivně použité pro audio stream |
| I2S word select | `GPIO25` | `I2S LRC/WS` | Aktivně použité pro audio stream |
| Audio enable | `GPIO21` | `AMP SD/EN` | Firmware drží v `HIGH` |

### Napájení

- Všechny moduly musí mít společnou `GND`.
- `HC-SR04` napájej z `VIN/5V`, ne z `3.3V`.
- Analogový mikrofon napájej z `3.3V`, pokud to jeho modul podporuje.
- `WS2812` pásek nebo ring napájej z `5V`; u delšího pásku nepoužívej `3.3V` pin z ESP32 jako hlavní zdroj.
- Pokud přidáš `I2S` zesilovač a reproduktor, napájej zesilovač z oddělené `5V` větve nebo stabilního externího zdroje. Nepředpokládej, že to utáhne `3.3V` větev na vývojové desce.

### Důležité ochrany

- `HC-SR04 ECHO` bývá `5V` TTL výstup. `ESP32` GPIO jsou `3.3V` logika, takže mezi `ECHO` a `GPIO18` dej dělič napětí, například `1k` z `ECHO` do uzlu a `2k` z uzlu do `GND`, nebo použij level shifter.
- Pokud je `WS2812` pásek napájený z `5V`, robustnější varianta je dát mezi `GPIO27` a `DIN` i `3.3V -> 5V` level shifter.
- U `WS2812` dej mezi `5V` a `GND` u prvního pixelu elektrolytický kondenzátor `500-1000 uF`.
- Připojuj v pořadí `GND -> napájení -> data`; odpojování naopak.

## Ideální fyzické zapojení pro aktuální baseline

1. `ESP32` napájej přes `USB`.
2. `HC-SR04`:
   - `VCC -> 5V/VIN`
   - `GND -> GND`
   - `TRIG -> GPIO5`
   - `ECHO -> GPIO18` přes dělič napětí
3. Analogový mikrofon:
   - `VCC -> 3.3V`
   - `GND -> GND`
   - `OUT -> GPIO32`
4. `WS2812` mode LED:
   - `5V -> 5V`
   - `GND -> GND`
   - `DIN -> GPIO27` přes `330-500 Ohm`
5. Pro audio variantu připoj `I2S` zesilovač:
   - `DIN -> GPIO22`
   - `BCLK -> GPIO26`
   - `LRC / WS -> GPIO25`
   - `SD / EN -> GPIO21`
   - `VIN -> 5V`
   - `GND -> GND`
6. Reproduktor nikdy nepřipojuj přímo do `ESP32`:
   - `speaker + -> AMP SPK+`
   - `speaker - -> AMP SPK-`

## Zapojení reproduktoru přes I2S zesilovač

Pro typický `MAX98357A` nebo podobný `I2S` mono zesilovač:

- `ESP32 GPIO22 -> AMP DIN`
- `ESP32 GPIO26 -> AMP BCLK / BCK`
- `ESP32 GPIO25 -> AMP LRC / WS`
- `ESP32 GPIO21 -> AMP SD / EN`
- `ESP32 5V / VIN -> AMP VIN`
- `ESP32 GND -> AMP GND`
- `speaker + -> AMP SPK+`
- `speaker - -> AMP SPK-`

Praktické poznámky:

- všechny země musí být společné: `ESP32 GND`, `AMP GND`, případně externí `5V GND`
- pokud má breakout vlastní `SD/EN` pull-up a pin není vyvedený, můžeš `GPIO21` ignorovat; v aktuálním firmware je ale připravený
- použij radši malý pasivní reproduktor `4-8 Ohm`; nezačínej na vysoké hlasitosti
- pokud zesilovač nemá zvuk a je napájený, zkontroluj nejdřív pořadí `DIN/BCLK/LRC`, ne software

## Wi-Fi a MQTT propojení s Docker runtime

Pro aktuální Docker setup je síťová cesta:

`ESP32 -> Wi-Fi -> hostitelský počítač:1883 -> docker mqtt -> Home Assistant + backend`

Důležité:

- do `MQTT_HOST` nedávej `mqtt`
- do `MQTT_HOST` nedávej ani WSL interní `172.x.x.x` adresu
- použij LAN IPv4 adresu hostitelského počítače v domácí síti, typicky z `ipconfig` na Windows

### Doporučený postup

1. Spusť stack:
   - `docker compose up -d --build`
2. Najdi LAN IP hostitele:
   - na Windows `ipconfig`
   - použij adresu z aktivního Wi‑Fi adaptéru, například `192.168.1.42`
3. Do sketch doplň:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `MQTT_HOST = "192.168.1.42"`
   - `MQTT_PORT = 1883`
   - `BACKEND_HOST = "192.168.1.42"`
   - `BACKEND_PORT = 3000`
4. Pokud broker nepoužívá přihlášení, nech:
   - `MQTT_USER = ""`
   - `MQTT_PASSWORD = ""`
5. Nahraj firmware a otevři `Serial Monitor` na `115200`.
6. Ověř, že ESP32 vypíše připojení k Wi‑Fi a MQTT.
7. Ve stacku ověř provoz:
   - `docker compose logs -f mqtt backend`

### Windows a firewall

Pokud se `ESP32` po Wi‑Fi k brokeru nepřipojí, zkontroluj nejdřív:

- že je `Docker Desktop` opravdu spuštěný
- že je publikovaný port `1883`
- že Windows firewall pouští příchozí `TCP 1883`

Pro přístup z telefonu nebo jiného zařízení na stejné Wi‑Fi mohou být potřeba i porty:

- `8123` pro `Home Assistant`
- `5173` pro frontend
- `3000` pro backend

## MQTT topics (publish)

- `jukebox/sensors/distance`
- `jukebox/sensors/clap`
- `jukebox/sensors/mic_level`
- `jukebox/device/rssi`
- `jukebox/device/uptime`
- `jukebox/device/health`
- `jukebox/device/system_health`
- `jukebox/system/event`

Payload je JSON ve tvaru:

`{"deviceId":"esp32-jukebox-01","timestamp":12345,"value":42}`

nebo pro textové stavy:

`{"deviceId":"esp32-jukebox-01","timestamp":12345,"status":"online"}`

Poznámka:

- `jukebox/system/health` je vyhrazený pro backend `Home Assistant` bridge
- firmware proto používá `jukebox/device/system_health`, aby se backend a `ESP32` nepřepisovaly na stejném topicu

## MQTT topics (subscribe)

- `jukebox/media/command`
- `jukebox/media/state`

Firmware momentálně rozpoznává příkazy z JSON pole `type` (nebo kompatibilně `command`):

- `play`
- `pause`
- `next`
- `previous`
- `set_volume`
- `set_mode`

Doporučený (sjednocený) tvar payloadu je:

- `{"type":"play"}`
- `{"type":"set_volume","volumePercent":72}`
- `{"type":"set_mode","mode":"focus"}`

Pro kompatibilitu firmware akceptuje i `command` místo `type`.

## Audio MVP přes jedno ESP32

Firmware teď umí sledovat `jukebox/media/state` a podle něj zkusit rozjet audio renderer na jednom `ESP32`.

Používá z payloadu hlavně:

- `source`
- `isPlaying`
- `activeTrackId`
- `volumePercent`

Když platí:

- `source == "local"`
- `isPlaying == true`
- `activeTrackId > 0`

ESP otevře HTTP stream:

`http://BACKEND_HOST:BACKEND_PORT/api/library/tracks/<trackId>/stream`

a pošle dekódovaný `MP3` do `I2S` výstupu.

### Co tato verze umí

- `Local MP3` stream z backendu
- změnu tracku podle backend stavu
- hlasitost přes `volumePercent`
- stop při `pause`
- retry při chybě otevření streamu
- ověřený výstup `ESP32 -> I2S zesilovač -> reproduktor` na reálném HW

### Co tato verze neumí nebo jen omezeně

- `Spotify` audio do `ESP32`
- skutečný `seek`
- skutečný `pause/resume` od stejné pozice
- garantovaně stabilní běh `audio + ultrasonic + vše ostatní`

Prakticky:

- `pause` zastaví stream
- další `play` znovu spustí aktuální track od začátku
- po dohrání tracku renderer čeká na další změnu stavu z backendu
- při aktivním audio streamu firmware dočasně nepublikuje `distance`, aby `pulseIn()` nedělal výpadky dekodéru

### Current live status: working with limits

Aktuálně je na živé sestavě potvrzené:

- `ESP32` přijme `jukebox/media/state`
- otevře `Local MP3` HTTP stream z backendu
- přehraje zvuk přes `I2S` zesilovač do reproduktoru
- hlasitost jde měnit přes backend stav

Aktuální demo profil firmware:

- `ENABLE_I2S_TEST_TONE = 0`
- `ENABLE_MIC_INPUT = 0`
- `MQTT` packet buffer je zvětšený kvůli většímu `media/state` payloadu

Reálné limity, které byly na HW pozorované:

- audio je použitelné pro demo, ale není to production-grade renderer
- v klidném prostředí hraje stabilně
- při rušení na `2.4 GHz` nebo při horší Wi-Fi kvalitě se může krátce kousnout nebo lupnout
- typicky se to zhorší, když je `ESP32` na hotspotu a poblíž běží další bezdrátové zařízení

Doporučení pro demo:

- drž `ESP32` co nejblíž hotspotu nebo AP
- během audio ukázky omez další `2.4 GHz` zařízení v okolí
- pro audio demo nech vypnutý `mic/clap` vstup
- pro čisté porovnání ztiš nebo zavři browser playback na notebooku

### Dočasný I2S test tone režim

Pro rychlé ověření zapojení zesilovače a reproduktoru je teď ve firmware zapnutý stabilní test tone:

- `ENABLE_I2S_TEST_TONE = true`
- `TEST_TONE_FREQUENCY_HZ = 440`
- `TEST_TONE_VOLUME_PERCENT = 18`

V tomhle režimu:

- `ESP32` po bootu začne rovnou generovat stabilní tón do `I2S`
- backend stream je dočasně obejitý
- ultrasonic telemetrie se při aktivním tónu neposílá, aby si audio a `pulseIn()` navzájem nerozbíjely timing

Jakmile reproduktor potvrdíš, vrať:

- `ENABLE_I2S_TEST_TONE = false`

a nahraj firmware znovu. Tím se vrátíš zpět na `Local MP3` stream z backendu.

### Doporučené audio zapojení

Pro běžný `MAX98357A` nebo podobný `I2S` zesilovač:

- `GPIO22 -> DIN`
- `GPIO26 -> BCLK`
- `GPIO25 -> LRC / WS`
- `GPIO21 -> SD / EN`
- `5V -> VIN`
- `GND -> GND`

Reproduktor připojuj na výstup zesilovače, ne přímo na `ESP32`.

### Rychlý smoke test I2S hardware

1. Nahraj firmware s:
   - `ENABLE_I2S_TEST_TONE = true`
2. Otevři `Serial Monitor` na `115200`.
3. Počkej na:
   - `Audio test tone started: 440 Hz @ 18%`
4. Poslouchej reproduktor.
5. Pokud nic neslyšíš, zkontroluj v tomhle pořadí:
   - napájení zesilovače `5V`
   - společnou `GND`
   - `SD / EN` pin
   - prohozené `DIN`, `BCLK`, `LRC`
   - že je reproduktor na `SPK+ / SPK-`, ne na `ESP32`

### Rychlý smoke test audio streamu z backendu

1. Spusť Docker stack a ověř:
   - backend na `3000`
   - MQTT na `1883`
2. Do firmware dej stejnou IP pro:
   - `MQTT_HOST`
   - `BACKEND_HOST`
3. Nahraj firmware a otevři `Serial Monitor` na `115200`.
4. Ve frontendu nebo přes `Home Assistant` spusť libovolný `Local MP3` track.
5. Pro čistý test `ESP` výstupu zavři frontend tab nebo ztiš notebook, protože frontend zatím pořád umí tentýž `Local MP3` renderovat i v prohlížeči.
6. V serialu sleduj:
   - `Media state -> ...`
   - `Audio stream started: http://...`
7. Ověř zvuk na reproduktoru.

Pokud vidíš opakovaně `audio_http_open_failed`, je špatně `BACKEND_HOST`, port `3000`, firewall nebo backend stream není dostupný.

### LED režimy (`set_mode`)

Pro LED pásek jsou nastavené barvy:

- `focus` -> modré jemné pulzování
- `party` -> rainbow animace
- `eco` -> statická zelená (low-power)
- ostatní/nezadané -> neutrální bílá

Příklad payloadů:

- `{"type":"set_mode","mode":"focus"}`
- `{"type":"set_mode","mode":"party"}`
- `{"type":"set_mode","mode":"eco"}`

## Rychlý test

Pošli například:

- topic: `jukebox/media/command`
- payload: `{"type":"play"}`

nebo:

- topic: `jukebox/media/command`
- payload: `{"type":"set_mode","mode":"focus"}`
