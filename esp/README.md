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
- heartbeat LED (indikace běhu firmware)

## Arduino IDE setup

1. Nainstaluj desku:
   - **Tools -> Board -> Boards Manager**
   - **ESP32 by Espressif Systems**
2. Nainstaluj knihovnu:
   - **Sketch -> Include Library -> Manage Libraries**
   - **PubSubClient**
   - **Adafruit NeoPixel**
3. Otevři sketch:
   - `esp/smarthome_jukebox_esp/smarthome_jukebox_esp.ino`
4. Doplň v horní části sketch:
   - `WIFI_SSID`, `WIFI_PASSWORD`
   - `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`
5. Nastav desku a port:
   - **Tools -> Board -> ESP32 Dev Module** (nebo konkrétní model)
   - **Tools -> Port -> COMx**
6. Nahraj přes **Upload**
7. Otevři **Serial Monitor** na `115200`

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

## Doporučené fyzické zapojení

Aktuální firmware opravdu používá:

- `HC-SR04`
- analogový mikrofonní modul s `OUT`
- stavovou LED na desce
- `WS2812` / `NeoPixel` mode LED pásek nebo ring

`I2S` piny jsou zatím jen rezervované pro budoucí audio výstup. Samotný sketch dnes nepřehrává zvuk do reproduktoru.

### Bezpečné minimum

| Funkce | ESP32 pin | Druhá strana | Poznámka |
| --- | --- | --- | --- |
| Ultrasonic `TRIG` | `GPIO5` | `HC-SR04 TRIG` | Přímé spojení |
| Ultrasonic `ECHO` | `GPIO18` | `HC-SR04 ECHO` | Vést přes dělič napětí nebo level shifter |
| Mic analog | `GPIO32` | `MIC OUT` | Jen pokud modul dává max `3.3 V` |
| Mode LED data | `GPIO27` | `WS2812 DIN` | Přes `330-500 Ohm` rezistor co nejblíž k první LED |
| I2S data rezervace | `GPIO22` | `I2S DIN` | Zatím rezerva |
| I2S bit clock rezerva | `GPIO26` | `I2S BCLK` | Zatím rezerva |
| I2S word select rezerva | `GPIO25` | `I2S LRC/WS` | Zatím rezerva |
| Audio enable rezervace | `GPIO21` | `AMP SD/EN` | Zatím rezerva, sketch ji drží v `HIGH` |

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
5. Budoucí `I2S` zesilovač nech až jako druhý krok po stabilním zprovoznění senzorů a MQTT.

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
