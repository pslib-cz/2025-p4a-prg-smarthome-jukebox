# JukeBoxík - iot projektík - není malej

# 🎙️ PROJEKT: VibeBox (Smart Mood Station)

**Tým:** 3 studenti (N=3) | **Platforma:** Home Assistant & ESPHome

---

## 🏗️ 1. TECHNICKÁ ARCHITEKTURA (Pohled pod kapotu)

- **Hardware (VibeBox):** ESP32 jako I2S audio klient, který zároveň sbírá data ze senzorů (vzdálenost, tlesknutí).
- **Audio Engine:** Home Assistant s add-onem **Music Assistant** (propojuje Spotify + lokální MP3 + streamuje do ESP32).
- **Hlas:** **Google Assistant** (Cloud pro mobil) + **MQTT** (komunikační most pro Dashboard).
- **Senzorová fúze:** Kombinace fyzických (ESP32) a síťových (Ping/Mobile) dat pro určení přítomnosti.

---

## 🛒 2. NÁKUPNÍ SEZNAM (BOM)

| **Součástka**           | **Účel**                                               |
| ----------------------- | ------------------------------------------------------ |
| **ESP32 DevKit V1**     | Mozek krabičky, Wi-Fi konektivita.                     |
| **MAX98357A I2S**       | Digitální audio zesilovač (pro čistý zvuk ze Spotify). |
| **Reproduktor 3W (4Ω)** | Zvukový výstup.                                        |
| **MAX4466 Mikrofon**    | Snímání tlesknutí a vizualizace hudby.                 |
| **HC-SR04**             | Ultrasonický senzor (oči boxu – detekce přítomnosti).  |
| **WS2812b LED pásek**   | Kruh nebo pásek (vizuální efekty a atmosféra).         |

---

## 👥 3. ROZDĚLENÍ ROLÍ A ÚKOLŮ

### 👨‍🔧 STUDENT A: Hardware Master (IoT & ESPHome)

- **Zapojení:** Sestavit obvod (ESP32 + I2S Audio + Senzory).
- **ESPHome YAML:**
  - Konfigurace i2s_audio a media_player pro streamování hudby.
  - Nastavení binary_sensor pro detekci tlesknutí (Clap detection).
  - Nastavení sensor pro vzdálenost (HC-SR04).
  - Tvorba LED efektů (Sound Reactive – blikání do rytmu).
- **Konstrukce:** Návrh a 3D tisk krabičky (VibeBox).

### 🧠 STUDENT B: Backend Architect (HA & Logic)

- **Instalace HA:** Zprovoznění Home Assistant + MQTT Broker (Mosquitto).
- **Audio Setup:** Instalace **Music Assistant**, propojení se **Spotify** a vytvoření lokální knihovny MP3.
- **Integrace:**
  - Nastavení **Google Assistant SDK** (propojení s hlasem v mobilu).
  - Nastavení **Ping (ICMP)** pro sledování notebooků/mobilů v síti.
  - Nastavení **Local Tuya** pro chytrou zásuvku.
- **Automatizace:** Tvorba scénářů (Focus, Party, Eco) – propojení senzorů z ESP s hudbou a zásuvkou.

### 🖥️ STUDENT C: Frontend & Security Developer (Web App)

- **Vlastní Dashboard:** Tvorba HTML/JS stránky (UI mixážního pultu).
- **Komunikace:** Implementace **MQTT over WebSockets** (JS knihovna Paho). Dashboard musí v reálném čase ukazovat:
  - Co hraje (Metadata ze Spotify).
  - Vzdálenost uživatele (graf).
  - Tlačítka pro manuální ovládání.
- **Zabezpečení:** Nastavení **HTTPS** (certifikáty) – nutné pro fungování moderních webových funkcí a autorizaci.

---

## 🤖 4. SCÉNÁŘE POUŽITÍ (Reálné situace)

### 1. Režim "Smart Focus" (Práce/Učení)

- **Trigger:** Senzor vzdálenosti vidí < 80 cm (sedíš u stolu).
- **Akce:** Music Assistant spustí **lokální MP3** (Lofi/Rain). LED svítí bíle.
- **Offline jistota:** Funguje i bez internetu!

### 2. Režim "Party Mood" (Zábava)

- **Trigger:** 3x tlesknutí (ESP) **NEBO** hlasový povel *"Hey Google, activate Party"*.
- **Akce:** Music Assistant přepne na **Spotify Playlist**. Tuya zásuvka zapne disco kouli. LEDky blikají do rytmu (Music Reactive).

### 3. Režim "Eco / Presence" (Ochrana soukromí a energie)

- **Trigger:** Mobil není na WiFi **A** Notebook je vypnutý (Ping) **A** Senzor nikoho nevidí.
- **Akce:** Vypne se hudba, světla i zásuvka.
- **Logika:** Vybitý mobil nezpůsobí vypnutí, pokud stále sedíš u stolu.

---

## 📅 5. ČASOVÝ PLÁN (Roadmapa)

1. **Týden 1:** Objednání HW, instalace Home Assistanta, vytvoření testovacího dashboardu ("Hello World").
2. **Týden 2:** Student A oživí ESP32 (zvuk hraje). Student B propojí Spotify. Student C rozběhne MQTT komunikaci.
3. **Týden 3:** Propojení s Google Assistantem. Ladění detekce tlesknutí a senzoru vzdálenosti.
4. **Týden 4:** 3D tisk krabičky, finální design dashboardu, zabezpečení (SSL).
5. **Týden 5:** Testování "výpadku internetu" (lokální stabilita) a příprava dokumentace.

---

## 🏆 6. PROČ TO BUDE ZA 100 BODŮ? (Argumenty pro komisi)

1. **Množství integrací:** ESPHome (DIY), MQTT (Protocol), Local Tuya (Komerční), Spotify (Media), Google (Cloud), Ping (Network), Sun (Virtual).
2. **Unikátnost:** Vlastní I2S audio streamovací box. Většina lidí končí u blikání LED.
3. **Hybridní přístup:** Máte cloudové pohodlí (Google/Spotify), ale lokální mozek (tleskání/vzdálenost), který přežije pád internetu.
4. **Zabezpečení:** Webový dashboard běží přes šifrované TLS a vyžaduje autorizaci k MQTT.
5. **Čistota HW:** Použití digitálního I2S rozhraní namísto analogových bzučáků.

---

## Rozšíření - optional

- spotify - může nemusí
- Další integrace pro disko (ale to jen kdyby, spíš dělat nebudeme):

| **Tuya WiFi Zásuvka** | Ovládání disco koule (komerční integrace).                 |
| --------------------- | ---------------------------------------------------------- |
| **MicroSD karta**     | Pro hudbu (pokud byste chtěli lokální zálohu přímo v ESP). |

- pokud se sežene dobrý repro:
  - tak by se přes bluetooth připojil home asitentovy
  - nebo kabel kdyby se něco posralo
  [Repro ai souhrn](https://www.notion.so/Repro-ai-souhrn-30ac685a65e880f2adf2da8843a1007d?pvs=21)

---

[Old idea](https://www.notion.so/Old-idea-30ac685a65e8804fbfa4cdd53bdafb93?pvs=21)

---
