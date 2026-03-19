# 🎙️ VibeBox: Smart Mood Station

VibeBox je autonomní, designová IoT stanice integrovaná do systému **Home Assistant**. Slouží jako inteligentní multimediální centrum, které kombinuje streamování hudby ve vysoké kvalitě (I2S), vizuální efekty a pokročilou senzorovou fúzi pro automatizaci atmosféry v místnosti.

Projekt je postaven s důrazem na **lokální autonomii**, bezpečnost a uživatelskou přívětivost skrze vlastní webový dashboard.

---

## 🚀 Hlavní funkce

- **Hybridní Audio Engine:** Streamování ze Spotify a lokálních MP3 knihoven skrze Music Assistant.
- **Senzorová fúze:** Inteligentní detekce přítomnosti kombinující ultrasonické měření vzdálenosti, síťové monitorování (Ping) a stav mobilních zařízení.
- **Interaktivní ovládání:** 
  - Bezdotyková gesta (detekce tlesknutí).
  - Hlasové ovládání (Google Assistant SDK).
  - Vlastní webový Dashboard (MQTT over WebSockets).
- **Adaptivní atmosféra:** Automatické přepínání režimů (Focus, Party, Eco) na základě environmentálních dat.
- **Vizuální odezva:** Adresovatelný LED pásek reagující na rytmus hudby a systémové stavy.

---

## 🏗️ Technická architektura

### Hardware (VibeBox Unit)
Srdcem systému je mikrokontrolér **ESP32**, který obsluhuje následující periferie:
- **Audio:** I2S DAC zesilovač (MAX98357A) připojený k 3W full-range reproduktoru.
- **Snímání:** Mikrofon MAX4466 (analogový sensing pro tleskání) a ultrasonický senzor HC-SR04 (proximity detekce).
- **Vizuál:** LED pásek WS2812B (Neopixel) pro stavovou indikaci a ambientní osvětlení.

### Software & Integrace
- **Home Assistant OS:** Centrální řídicí hub.
- **ESPHome:** Firmware pro ESP32 zajišťující nízkolatenční sběr dat a audio streamování.
- **MQTT (Mosquitto):** Komunikační protokol pro real-time synchronizaci mezi hardwarem, backendem a frontendem.
- **Music Assistant:** Správa a mixování audio streamů (Spotify/Local).
- **Local Tuya:** Lokální ovládání komerčních akčních členů (např. disco koule v chytré zásuvce).

---

## 🤖 Automatizační scénáře

1.  **Režim "Smart Focus"**
    - *Trigger:* Detekce osoby u stolu (< 80 cm) + západ slunce.
    - *Akce:* Spuštění Lo-Fi playlistu (lokální MP3), nastavení teplého bílého podsvícení, útlum okolních zařízení.
2.  **Režim "Voice DJ & Party"**
    - *Trigger:* 3x tlesknutí nebo hlasový příkaz "OK Google, activate Party".
    - *Akce:* Přepnutí na Spotify playlist, aktivace Sound-Reactive LED módu, sepnutí disco koule v zásuvce.
3.  **Režim "Eco / Presence"**
    - *Logika:* Systém se vypne pouze při splnění podmínky "Nikdo není doma" (Mobil offline AND PC offline AND Proximity senzor nikoho nevidí).

---

## 🖥️ Webový Dashboard

Vlastní klientská aplikace postavená na HTML5/JavaScriptu komunikující přes **zabezpečené WebSockets (MQTT over TLS)**.

**Obsah dashboardu:**
- **Now Playing:** Metadata skladby, obal alba, ovládací prvky přehrávání a vizualizér.
- **Telemetrie:** Graf vzdálenosti uživatele v reálném čase a indikátor přítomnosti.
- **System Logs:** Live feed MQTT zpráv a systémových událostí pro monitoring.
- **Security:** Implementace HTTPS certifikátů pro zajištění bezpečné komunikace a funkčnosti Web Speech API.

---

## 🛠️ Instalace a zprovoznění

1.  **Hardware:** Zapojte komponenty dle schématu v dokumentaci.
2.  **ESPHome:** Flashněte ESP32 přiloženým YAML konfiguračním souborem.
3.  **Home Assistant:**
    - Nainstalujte MQTT Broker a Music Assistant.
    - Importujte automatizace ze složky `/automations`.
4.  **Frontend:** 
    - Nahrajte obsah složky `/dashboard` na váš webový server.
    - Konfigurujte připojení k MQTT brokeru v `config.js`.

---

## 🛡️ Bezpečnost
Veškerá komunikace s externím dashboardem probíhá skrze šifrované protokoly. Systém je navržen tak, aby kritické funkce automatizace (Focus mód, detekce přítomnosti) fungovaly i při výpadku internetového připojení v rámci lokální sítě.

---
*Tento projekt byl vytvořen jako řešení pro předmět zaměřený na automatizaci a Internet věcí (IoT).*