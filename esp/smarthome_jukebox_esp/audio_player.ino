#include <AudioFileSourceBuffer.h>
#include <AudioFileSourceHTTPStream.h>
#include <AudioGeneratorMP3.h>
#include <AudioLogger.h>
#include <AudioOutputI2S.h>

const uint32_t AUDIO_STREAM_BUFFER_BYTES = 8192;
const unsigned long AUDIO_RETRY_DELAY_MS = 3000;

AudioGeneratorMP3* audioGenerator = nullptr;
AudioFileSourceHTTPStream* audioHttpSource = nullptr;
AudioFileSourceBuffer* audioBufferedSource = nullptr;
AudioOutputI2S* audioOutput = nullptr;

String desiredAudioSource = "local";
bool desiredAudioPlaying = false;
int desiredAudioTrackId = -1;
int desiredAudioVolumePercent = 72;
int currentAudioTrackId = -1;
unsigned long audioRetryAtMs = 0;

uint8_t audioStreamBuffer[AUDIO_STREAM_BUFFER_BYTES];
uint8_t audioDecoderWorkspace[AudioGeneratorMP3::preAllocSize()];

int clampAudioPercent(int value) {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

bool isAudioPlaybackActive() {
  return audioGenerator != nullptr && audioGenerator->isRunning();
}

bool shouldPlayDesiredAudio() {
  return desiredAudioSource == "local" &&
         desiredAudioPlaying &&
         desiredAudioTrackId > 0 &&
         strlen(BACKEND_HOST) > 0;
}

float audioGainFromVolumePercent(int volumePercent) {
  return static_cast<float>(clampAudioPercent(volumePercent)) / 100.0f;
}

String buildTrackStreamUrl(int trackId) {
  String url = "http://";
  url += BACKEND_HOST;
  url += ":";
  url += String(BACKEND_PORT);
  url += "/api/library/tracks/";
  url += String(trackId);
  url += "/stream";
  return url;
}

void destroyAudioPipeline() {
  if (audioGenerator != nullptr) {
    delete audioGenerator;
    audioGenerator = nullptr;
  }

  if (audioBufferedSource != nullptr) {
    delete audioBufferedSource;
    audioBufferedSource = nullptr;
  }

  if (audioHttpSource != nullptr) {
    delete audioHttpSource;
    audioHttpSource = nullptr;
  }

  if (audioOutput != nullptr) {
    delete audioOutput;
    audioOutput = nullptr;
  }

  currentAudioTrackId = -1;
}

void applyAudioVolume() {
  desiredAudioVolumePercent = clampAudioPercent(desiredAudioVolumePercent);

  if (audioOutput != nullptr) {
    audioOutput->SetGain(audioGainFromVolumePercent(desiredAudioVolumePercent));
  }
}

bool ensureAudioOutput() {
  if (audioOutput != nullptr) {
    return true;
  }

  audioOutput = new AudioOutputI2S();
  if (audioOutput == nullptr) {
    Serial.println("Audio output allocation failed.");
    publishEvent("audio_output_allocation_failed");
    return false;
  }

  audioOutput->SetPinout(PIN_I2S_BCLK, PIN_I2S_LRC, PIN_I2S_DIN);
  audioOutput->SetOutputModeMono(true);
  applyAudioVolume();
  return true;
}

void stopAudioPlayback(const String& reason, bool retry) {
  destroyAudioPipeline();

  if (retry && shouldPlayDesiredAudio()) {
    audioRetryAtMs = millis() + AUDIO_RETRY_DELAY_MS;
  } else {
    audioRetryAtMs = 0;
  }

  if (reason.length() > 0) {
    Serial.print("Audio stop: ");
    Serial.println(reason);
    publishEvent(reason);
  }
}

bool startAudioPlayback(int trackId) {
  destroyAudioPipeline();

  if (!ensureAudioOutput()) {
    audioRetryAtMs = millis() + AUDIO_RETRY_DELAY_MS;
    return false;
  }

  String url = buildTrackStreamUrl(trackId);
  audioHttpSource = new AudioFileSourceHTTPStream();
  if (audioHttpSource == nullptr || !audioHttpSource->open(url.c_str())) {
    Serial.print("Audio HTTP open failed: ");
    Serial.println(url);
    publishEvent("audio_http_open_failed");
    stopAudioPlayback("", true);
    return false;
  }

  audioBufferedSource = new AudioFileSourceBuffer(
    audioHttpSource,
    audioStreamBuffer,
    sizeof(audioStreamBuffer),
  );
  if (audioBufferedSource == nullptr) {
    publishEvent("audio_buffer_allocation_failed");
    stopAudioPlayback("", true);
    return false;
  }

  audioGenerator = new AudioGeneratorMP3(
    audioDecoderWorkspace,
    sizeof(audioDecoderWorkspace),
  );
  if (audioGenerator == nullptr || !audioGenerator->begin(audioBufferedSource, audioOutput)) {
    Serial.print("Audio decoder start failed for track ");
    Serial.println(trackId);
    publishEvent("audio_decoder_start_failed");
    stopAudioPlayback("", true);
    return false;
  }

  currentAudioTrackId = trackId;
  audioRetryAtMs = 0;
  Serial.print("Audio stream started: ");
  Serial.println(url);
  publishEvent("audio_stream_started");
  return true;
}

void syncAudioPlayback() {
  applyAudioVolume();

  if (!shouldPlayDesiredAudio()) {
    if (isAudioPlaybackActive()) {
      stopAudioPlayback("audio_stream_stopped", false);
    } else {
      audioRetryAtMs = 0;
      currentAudioTrackId = -1;
    }
    return;
  }

  if (isAudioPlaybackActive() && currentAudioTrackId == desiredAudioTrackId) {
    return;
  }

  startAudioPlayback(desiredAudioTrackId);
}

void setupAudioPlayback() {
  audioLogger = &Serial;
  desiredAudioSource = "local";
  desiredAudioPlaying = false;
  desiredAudioTrackId = -1;
  desiredAudioVolumePercent = 72;
  currentAudioTrackId = -1;
  audioRetryAtMs = 0;
}

void handleMediaState(const String& payload) {
  String source = extractJsonString(payload, "source");
  if (source.length() > 0) {
    desiredAudioSource = source;
  }

  desiredAudioPlaying = extractJsonBool(payload, "isPlaying", desiredAudioPlaying);
  desiredAudioTrackId = extractJsonInt(payload, "activeTrackId", desiredAudioTrackId);
  desiredAudioVolumePercent = extractJsonInt(
    payload,
    "volumePercent",
    desiredAudioVolumePercent,
  );

  Serial.print("Media state -> source=");
  Serial.print(desiredAudioSource);
  Serial.print(", track=");
  Serial.print(desiredAudioTrackId);
  Serial.print(", playing=");
  Serial.print(desiredAudioPlaying ? "true" : "false");
  Serial.print(", volume=");
  Serial.println(desiredAudioVolumePercent);

  syncAudioPlayback();
}

void loopAudioPlayback() {
  if (audioBufferedSource != nullptr) {
    audioBufferedSource->loop();
  }

  if (audioGenerator != nullptr && audioGenerator->isRunning()) {
    if (!audioGenerator->loop()) {
      stopAudioPlayback("audio_stream_finished", false);
    }
    return;
  }

  if (audioRetryAtMs != 0 && millis() >= audioRetryAtMs && shouldPlayDesiredAudio()) {
    startAudioPlayback(desiredAudioTrackId);
  }
}
