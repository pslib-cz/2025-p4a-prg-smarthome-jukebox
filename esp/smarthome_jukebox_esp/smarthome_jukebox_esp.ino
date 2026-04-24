#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_NeoPixel.h>
#include <math.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

// ===== User setup =====
const char* WIFI_SSID = "asus";
const char* WIFI_PASSWORD = "123456789";

const char* MQTT_HOST = "192.168.137.1";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER = "admin";
const char* MQTT_PASSWORD = "1234";
const char* BACKEND_HOST = MQTT_HOST;
const uint16_t BACKEND_PORT = 3000;
#define ENABLE_I2S_TEST_TONE 0
#define TEST_TONE_FREQUENCY_HZ 440
#define TEST_TONE_VOLUME_PERCENT 5
// Keep ADC-based mic/clap disabled while testing I2S streaming.
#define ENABLE_MIC_INPUT 0

// Device and MQTT topics aligned with the project contract.
const char* DEVICE_ID = "esp32-jukebox-01";
const char* TOPIC_DISTANCE = "jukebox/sensors/distance";
const char* TOPIC_CLAP = "jukebox/sensors/clap";
const char* TOPIC_MIC_LEVEL = "jukebox/sensors/mic_level";
const char* TOPIC_RSSI = "jukebox/device/rssi";
const char* TOPIC_UPTIME = "jukebox/device/uptime";
const char* TOPIC_HEALTH = "jukebox/device/health";
const char* TOPIC_SYSTEM_HEALTH = "jukebox/device/system_health";
const char* TOPIC_SYSTEM_EVENT = "jukebox/system/event";
const char* TOPIC_MEDIA_COMMAND = "jukebox/media/command";
const char* TOPIC_MEDIA_STATE = "jukebox/media/state";

// Pin map from the current hardware wiring.
const int PIN_LED_STATUS = LED_BUILTIN;
const int PIN_ULTRASONIC_TRIG = 5;
const int PIN_ULTRASONIC_ECHO = 18;
const int PIN_MIC_ANALOG = 32;
const int PIN_I2S_DIN = 22;
const int PIN_I2S_BCLK = 26;
const int PIN_I2S_LRC = 25;
const int PIN_I2S_SD = 21;
const int PIN_MODE_LED_DATA = 27;
const int MODE_LED_COUNT = 8;
const uint16_t MQTT_PACKET_BUFFER_BYTES = 1024;
const int MIC_CLAP_THRESHOLD = 3600;
const int MIC_CLAP_DELTA_THRESHOLD = 850;
const unsigned long CLAP_DEBOUNCE_MS = 450;
// ======================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Adafruit_NeoPixel modeLeds(MODE_LED_COUNT, PIN_MODE_LED_DATA, NEO_GRB + NEO_KHZ800);
unsigned long lastTelemetryMs = 0;
unsigned long lastHealthPublishMs = 0;
unsigned long lastMicPublishMs = 0;
unsigned long lastDistancePublishMs = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long lastClapMs = 0;
unsigned long lastModeAnimationMs = 0;
bool ledState = false;
int micBaseline = 2048;
unsigned long clapCount = 0;
String currentMode = "idle";
uint16_t partyHueOffset = 0;
float focusPulsePhase = 0.0f;
void setupAudioPlayback();
void loopAudioPlayback();
void handleMediaState(const String& payload);
bool isAudioPlaybackActive();
bool isAnyAudioOutputActive();

uint32_t modeColor(const String& mode) {
  if (mode == "focus") {
    return modeLeds.Color(0, 80, 255);  // blue
  }
  if (mode == "party") {
    return modeLeds.Color(220, 0, 255);  // purple
  }
  if (mode == "eco") {
    return modeLeds.Color(0, 180, 60);  // green
  }
  return modeLeds.Color(120, 120, 120);  // neutral
}

void renderModeLeds(const String& mode) {
  uint32_t color = modeColor(mode);
  for (int i = 0; i < MODE_LED_COUNT; i++) {
    modeLeds.setPixelColor(i, color);
  }
  modeLeds.show();
}

void animateModeLeds() {
  unsigned long now = millis();

  if (now - lastModeAnimationMs < 40) {
    return;
  }
  lastModeAnimationMs = now;

  if (currentMode == "party") {
    for (int i = 0; i < MODE_LED_COUNT; i++) {
      uint16_t pixelHue = partyHueOffset + (i * 65535UL / MODE_LED_COUNT);
      modeLeds.setPixelColor(i, modeLeds.gamma32(modeLeds.ColorHSV(pixelHue)));
    }
    partyHueOffset += 800;
    modeLeds.show();
    return;
  }

  if (currentMode == "focus") {
    focusPulsePhase += 0.08f;
    if (focusPulsePhase > 6.283185f) {
      focusPulsePhase = 0.0f;
    }
    float normalized = (sinf(focusPulsePhase) + 1.0f) * 0.5f;  // 0..1
    uint8_t blue = static_cast<uint8_t>(40 + normalized * 180);
    uint8_t green = static_cast<uint8_t>(5 + normalized * 25);
    for (int i = 0; i < MODE_LED_COUNT; i++) {
      modeLeds.setPixelColor(i, modeLeds.Color(0, green, blue));
    }
    modeLeds.show();
    return;
  }

  if (currentMode == "eco") {
    // Eco stays static and low-power.
    return;
  }
}

long readDistanceCm() {
  digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
  delayMicroseconds(3);
  digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_ULTRASONIC_TRIG, LOW);

  unsigned long durationUs = pulseIn(PIN_ULTRASONIC_ECHO, HIGH, 30000);
  if (durationUs == 0) {
    return -1;
  }

  return static_cast<long>(durationUs * 0.0343f / 2.0f);
}

bool clapDetected() {
#if !ENABLE_MIC_INPUT
  return false;
#else
  int micLevel = analogRead(PIN_MIC_ANALOG);
  int deltaFromBaseline = micLevel - micBaseline;
  if (micLevel < MIC_CLAP_THRESHOLD) micBaseline = (micBaseline * 7 + micLevel) / 8;
  if (micLevel >= MIC_CLAP_THRESHOLD && deltaFromBaseline >= MIC_CLAP_DELTA_THRESHOLD &&
      (millis() - lastClapMs) > CLAP_DEBOUNCE_MS) {
    lastClapMs = millis();
    return true;
  }
  return false;
#endif
}

void publishJsonValue(const char* topic, const String& value, bool retained) {
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"timestamp\":" + String(millis()) + ",";
  payload += "\"value\":" + value;
  payload += "}";

  mqttClient.publish(topic, payload.c_str(), retained);
}

void publishJsonText(const char* topic, const char* key, const String& text, bool retained) {
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"timestamp\":" + String(millis()) + ",";
  payload += "\"" + String(key) + "\":\"" + text + "\"";
  payload += "}";

  mqttClient.publish(topic, payload.c_str(), retained);
}

String extractJsonString(const String& json, const char* key) {
  String keyToken = "\"" + String(key) + "\"";
  int keyPos = json.indexOf(keyToken);
  if (keyPos < 0) {
    return "";
  }

  int colonPos = json.indexOf(':', keyPos + keyToken.length());
  if (colonPos < 0) {
    return "";
  }

  int quoteStart = json.indexOf('"', colonPos + 1);
  if (quoteStart < 0) {
    return "";
  }

  int quoteEnd = json.indexOf('"', quoteStart + 1);
  if (quoteEnd < 0 || quoteEnd <= quoteStart) {
    return "";
  }

  return json.substring(quoteStart + 1, quoteEnd);
}

int extractJsonInt(const String& json, const char* key, int fallback) {
  String keyToken = "\"" + String(key) + "\"";
  int keyPos = json.indexOf(keyToken);
  if (keyPos < 0) {
    return fallback;
  }

  int colonPos = json.indexOf(':', keyPos + keyToken.length());
  if (colonPos < 0) {
    return fallback;
  }

  int start = colonPos + 1;
  while (start < static_cast<int>(json.length()) &&
         (json[start] == ' ' || json[start] == '\t')) {
    start++;
  }

  int end = start;
  while (end < static_cast<int>(json.length()) &&
         ((json[end] >= '0' && json[end] <= '9') || json[end] == '-')) {
    end++;
  }

  if (end == start) {
    return fallback;
  }

  return json.substring(start, end).toInt();
}

bool extractJsonBool(const String& json, const char* key, bool fallback) {
  String keyToken = "\"" + String(key) + "\"";
  int keyPos = json.indexOf(keyToken);
  if (keyPos < 0) {
    return fallback;
  }

  int colonPos = json.indexOf(':', keyPos + keyToken.length());
  if (colonPos < 0) {
    return fallback;
  }

  int start = colonPos + 1;
  while (start < static_cast<int>(json.length()) &&
         (json[start] == ' ' || json[start] == '\t')) {
    start++;
  }

  if (json.startsWith("true", start)) {
    return true;
  }
  if (json.startsWith("false", start)) {
    return false;
  }

  return fallback;
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void publishPeriodicTelemetry() {
  unsigned long now = millis();

  if (now - lastDistancePublishMs >= 1000) {
    lastDistancePublishMs = now;
    if (!isAnyAudioOutputActive()) {
      long distanceCm = readDistanceCm();
      publishJsonValue(TOPIC_DISTANCE, String(distanceCm), false);
    }
  }

  if (now - lastMicPublishMs >= 250) {
    lastMicPublishMs = now;
#if ENABLE_MIC_INPUT
    int micLevel = analogRead(PIN_MIC_ANALOG);
    publishJsonValue(TOPIC_MIC_LEVEL, String(micLevel), false);
#endif
  }

  if (now - lastTelemetryMs >= 5000) {
    lastTelemetryMs = now;
    publishJsonValue(TOPIC_RSSI, String(WiFi.RSSI()), false);
    publishJsonValue(TOPIC_UPTIME, String(now / 1000), false);
  }

  if (now - lastHealthPublishMs >= 10000) {
    lastHealthPublishMs = now;
    publishJsonText(TOPIC_HEALTH, "status", "online", true);
    publishJsonText(TOPIC_SYSTEM_HEALTH, "status", "online", true);
  }
}

void publishEvent(const String& message) {
  publishJsonText(TOPIC_SYSTEM_EVENT, "event", message, false);
}

void applyMode(const String& mode) {
  currentMode = mode;
  if (currentMode == "party") {
    partyHueOffset = 0;
  }
  if (currentMode == "focus") {
    focusPulsePhase = 0.0f;
  }
  renderModeLeds(currentMode);
  publishEvent("mode_" + currentMode);
  Serial.print("Mode set to: ");
  Serial.println(currentMode);
}

void handleMediaCommand(const String& payload) {
  Serial.print("Media command payload: ");
  Serial.println(payload);

  String commandType = extractJsonString(payload, "type");
  if (commandType.length() == 0) {
    commandType = extractJsonString(payload, "command");
  }

  if (commandType == "play") {
    Serial.println("Action: PLAY");
    publishEvent("media_play");
  } else if (commandType == "pause") {
    Serial.println("Action: PAUSE");
    publishEvent("media_pause");
  } else if (commandType == "next") {
    Serial.println("Action: NEXT");
    publishEvent("media_next");
  } else if (commandType == "previous") {
    Serial.println("Action: PREVIOUS");
    publishEvent("media_previous");
  } else if (commandType == "set_volume") {
    int volumePercent = extractJsonInt(payload, "volumePercent", -1);
    Serial.print("Action: SET_VOLUME -> ");
    Serial.println(volumePercent);
    publishEvent("media_set_volume");
  } else if (commandType == "seek") {
    int progressPercent = extractJsonInt(payload, "progressPercent", -1);
    Serial.print("Action: SEEK -> ");
    Serial.println(progressPercent);
    publishEvent("media_seek");
  } else if (commandType == "play_track") {
    int trackId = extractJsonInt(payload, "trackId", -1);
    Serial.print("Action: PLAY_TRACK -> ");
    Serial.println(trackId);
    publishEvent("media_play_track");
  } else if (commandType == "set_mode") {
    Serial.println("Action: SET_MODE");
    String mode = extractJsonString(payload, "mode");
    if (mode != "focus" && mode != "party" && mode != "eco" && mode != "idle") {
      mode = "idle";
    }
    applyMode(mode);
  } else {
    Serial.println("Unknown media command.");
    publishEvent("unknown_media_command");
  }
}

void mqttCallback(char* topic, byte* message, unsigned int length) {
  String topicString(topic);
  String payload;
  payload.reserve(length);

  for (unsigned int i = 0; i < length; i++) {
    payload += static_cast<char>(message[i]);
  }

  if (topicString == TOPIC_MEDIA_COMMAND) {
    handleMediaCommand(payload);
  } else if (topicString == TOPIC_MEDIA_STATE) {
    handleMediaState(payload);
  }
}
void connectMqtt() {
  if (!mqttClient.setBufferSize(MQTT_PACKET_BUFFER_BYTES)) {
    Serial.println("Failed to grow MQTT packet buffer.");
  }
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT broker...");

    bool connected = false;
    if (strlen(MQTT_USER) == 0) {
      connected = mqttClient.connect(DEVICE_ID);
    } else {
      connected = mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASSWORD);
    }

    if (connected) {
      Serial.println("connected");
      mqttClient.subscribe(TOPIC_MEDIA_COMMAND);
      mqttClient.subscribe(TOPIC_MEDIA_STATE);
      publishJsonText(TOPIC_HEALTH, "status", "online", true);
      publishJsonText(TOPIC_SYSTEM_HEALTH, "status", "online", true);
      publishEvent("mqtt_connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retry in 2s");
      delay(2000);
    }
  }
}

void setup() {
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
  pinMode(PIN_ULTRASONIC_ECHO, INPUT);
  pinMode(PIN_MIC_ANALOG, INPUT);
  pinMode(PIN_I2S_SD, OUTPUT);
  digitalWrite(PIN_I2S_SD, HIGH);

  modeLeds.begin();
  modeLeds.setBrightness(80);
  modeLeds.clear();
  modeLeds.show();

  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("SmartHome Jukebox ESP32 boot");
  Serial.println("I2S amp pin map:");
  Serial.print("  DIN=");
  Serial.println(PIN_I2S_DIN);
  Serial.print("  BCLK=");
  Serial.println(PIN_I2S_BCLK);
  Serial.print("  LRC=");
  Serial.println(PIN_I2S_LRC);
  Serial.print("  SD=");
  Serial.println(PIN_I2S_SD);
  Serial.print("  LED_DATA=");
  Serial.println(PIN_MODE_LED_DATA);
  if (ENABLE_I2S_TEST_TONE) {
    Serial.print("I2S test tone enabled: ");
    Serial.print(TEST_TONE_FREQUENCY_HZ);
    Serial.print(" Hz @ ");
    Serial.print(TEST_TONE_VOLUME_PERCENT);
    Serial.println("%");
  }

  setupAudioPlayback();
  connectWifi();
  connectMqtt();
  applyMode("idle");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (!mqttClient.connected()) {
    connectMqtt();
  }

  mqttClient.loop();
  loopAudioPlayback();
  publishPeriodicTelemetry();
  animateModeLeds();

  if (clapDetected()) {
    clapCount++;
    publishJsonValue(TOPIC_CLAP, String(clapCount), false);
    publishEvent("clap_detected");
  }
  if (millis() - lastHeartbeatMs >= 1000) {
    lastHeartbeatMs = millis();
    ledState = !ledState;
    digitalWrite(PIN_LED_STATUS, ledState ? HIGH : LOW);
  }
}
