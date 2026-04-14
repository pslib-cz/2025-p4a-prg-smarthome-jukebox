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

## MQTT topics (publish)

- `jukebox/sensors/distance`
- `jukebox/sensors/clap`
- `jukebox/sensors/mic_level`
- `jukebox/device/rssi`
- `jukebox/device/uptime`
- `jukebox/device/health`
- `jukebox/system/health`
- `jukebox/system/event`

Payload je JSON ve tvaru:

`{"deviceId":"esp32-jukebox-01","timestamp":12345,"value":42}`

nebo pro textové stavy:

`{"deviceId":"esp32-jukebox-01","timestamp":12345,"status":"online"}`

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
