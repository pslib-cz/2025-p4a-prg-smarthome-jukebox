#if ENABLE_I2S_TEST_TONE
#include <driver/i2s.h>
#else
#include <AudioFileSourceBuffer.h>
#include <AudioFileSourceHTTPStream.h>
#include <AudioGeneratorMP3.h>
#include <AudioLogger.h>
#include <AudioOutputI2S.h>
#endif

#if ENABLE_I2S_TEST_TONE
const i2s_port_t AUDIO_TEST_TONE_PORT = I2S_NUM_0;
const uint32_t AUDIO_TEST_TONE_SAMPLE_RATE = 16000;
const size_t AUDIO_TEST_TONE_FRAME_SAMPLES = 256;
const float AUDIO_TEST_TONE_MAX_AMPLITUDE = 16000.0f;
#endif

#if !ENABLE_I2S_TEST_TONE
const uint32_t AUDIO_STREAM_BUFFER_BYTES = 16384;
const unsigned long AUDIO_RETRY_DELAY_MS = 3000;

AudioGeneratorMP3* audioGenerator = nullptr;
AudioFileSourceHTTPStream* audioHttpSource = nullptr;
AudioFileSourceBuffer* audioBufferedSource = nullptr;
AudioOutputI2S* audioOutput = nullptr;
#endif

String desiredAudioSource = "local";
bool desiredAudioPlaying = false;
int desiredAudioTrackId = -1;
int desiredAudioVolumePercent = 72;
int currentAudioTrackId = -1;
unsigned long audioRetryAtMs = 0;
bool audioTestToneActive = false;
#if ENABLE_I2S_TEST_TONE
float audioTestTonePhase = 0.0f;
int16_t audioTestToneFrames[AUDIO_TEST_TONE_FRAME_SAMPLES * 2];
#endif

#if !ENABLE_I2S_TEST_TONE
uint8_t audioStreamBuffer[AUDIO_STREAM_BUFFER_BYTES];
uint8_t audioDecoderWorkspace[AudioGeneratorMP3::preAllocSize()];
#endif

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
#if ENABLE_I2S_TEST_TONE
  return false;
#else
  return audioGenerator != nullptr && audioGenerator->isRunning();
#endif
}

bool isAnyAudioOutputActive() {
  return isAudioPlaybackActive() || audioTestToneActive;
}

bool shouldPlayDesiredAudio() {
#if ENABLE_I2S_TEST_TONE
  return false;
#else
  return desiredAudioSource == "local" &&
         desiredAudioPlaying &&
         desiredAudioTrackId > 0 &&
         strlen(BACKEND_HOST) > 0;
#endif
}

float audioGainFromVolumePercent(int volumePercent) {
  return static_cast<float>(clampAudioPercent(volumePercent)) / 100.0f;
}

String buildTrackStreamUrl(int trackId) {
#if ENABLE_I2S_TEST_TONE
  return "";
#else
  String url = "http://";
  url += BACKEND_HOST;
  url += ":";
  url += String(BACKEND_PORT);
  url += "/api/library/tracks/";
  url += String(trackId);
  url += "/stream";
  return url;
#endif
}

void destroyAudioPipeline() {
#if !ENABLE_I2S_TEST_TONE
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
#endif
}

void applyAudioVolume() {
  desiredAudioVolumePercent = clampAudioPercent(desiredAudioVolumePercent);

#if !ENABLE_I2S_TEST_TONE
  if (audioOutput != nullptr) {
    audioOutput->SetGain(audioGainFromVolumePercent(desiredAudioVolumePercent));
  }
#endif
}

#if ENABLE_I2S_TEST_TONE
int16_t nextAudioTestToneSample() {
  float normalizedVolume = static_cast<float>(clampAudioPercent(desiredAudioVolumePercent)) / 100.0f;
  float amplitude = AUDIO_TEST_TONE_MAX_AMPLITUDE * normalizedVolume;
  int16_t sample = (audioTestTonePhase < 0.5f)
    ? static_cast<int16_t>(amplitude)
    : static_cast<int16_t>(-amplitude);

  audioTestTonePhase += static_cast<float>(TEST_TONE_FREQUENCY_HZ) /
                        static_cast<float>(AUDIO_TEST_TONE_SAMPLE_RATE);
  if (audioTestTonePhase >= 1.0f) {
    audioTestTonePhase -= 1.0f;
  }

  return sample;
}

void fillAudioTestToneFrames() {
  for (size_t index = 0; index < AUDIO_TEST_TONE_FRAME_SAMPLES; index++) {
    int16_t sample = nextAudioTestToneSample();
    size_t stereoOffset = index * 2;
    audioTestToneFrames[stereoOffset] = sample;
    audioTestToneFrames[stereoOffset + 1] = sample;
  }
}

void stopAudioTestTone(const String& reason) {
  if (!audioTestToneActive) {
    return;
  }

  i2s_zero_dma_buffer(AUDIO_TEST_TONE_PORT);
  i2s_stop(AUDIO_TEST_TONE_PORT);
  i2s_driver_uninstall(AUDIO_TEST_TONE_PORT);
  audioTestToneActive = false;
  audioTestTonePhase = 0.0f;

  if (reason.length() > 0) {
    Serial.print("Audio test tone stop: ");
    Serial.println(reason);
    publishEvent(reason);
  }
}

bool startAudioTestTone() {
  if (audioTestToneActive) {
    return true;
  }

#if !ENABLE_I2S_TEST_TONE
  destroyAudioPipeline();
#endif

  i2s_config_t config = {};
  config.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX);
  config.sample_rate = AUDIO_TEST_TONE_SAMPLE_RATE;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  config.channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT;
#if defined(I2S_COMM_FORMAT_STAND_I2S)
  config.communication_format = I2S_COMM_FORMAT_STAND_I2S;
#else
  config.communication_format = static_cast<i2s_comm_format_t>(
    I2S_COMM_FORMAT_I2S | I2S_COMM_FORMAT_I2S_MSB
  );
#endif
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 8;
  config.dma_buf_len = AUDIO_TEST_TONE_FRAME_SAMPLES;
  config.use_apll = false;
  config.tx_desc_auto_clear = true;
  config.fixed_mclk = 0;

  i2s_pin_config_t pinConfig = {};
  pinConfig.bck_io_num = PIN_I2S_BCLK;
  pinConfig.ws_io_num = PIN_I2S_LRC;
  pinConfig.data_out_num = PIN_I2S_DIN;
  pinConfig.data_in_num = I2S_PIN_NO_CHANGE;

  esp_err_t installResult = i2s_driver_install(AUDIO_TEST_TONE_PORT, &config, 0, nullptr);
  if (installResult != ESP_OK) {
    Serial.print("Audio test tone driver install failed: ");
    Serial.println(static_cast<int>(installResult));
    publishEvent("audio_test_tone_driver_install_failed");
    return false;
  }

  esp_err_t pinResult = i2s_set_pin(AUDIO_TEST_TONE_PORT, &pinConfig);
  if (pinResult != ESP_OK) {
    Serial.print("Audio test tone pin setup failed: ");
    Serial.println(static_cast<int>(pinResult));
    i2s_driver_uninstall(AUDIO_TEST_TONE_PORT);
    publishEvent("audio_test_tone_pin_setup_failed");
    return false;
  }

  i2s_zero_dma_buffer(AUDIO_TEST_TONE_PORT);
  i2s_start(AUDIO_TEST_TONE_PORT);
  audioTestToneActive = true;
  audioTestTonePhase = 0.0f;

  Serial.print("Audio test tone started: ");
  Serial.print(TEST_TONE_FREQUENCY_HZ);
  Serial.print(" Hz @ ");
  Serial.print(desiredAudioVolumePercent);
  Serial.println("%");
  publishEvent("audio_test_tone_started");
  return true;
}

void loopAudioTestTone() {
  if (!audioTestToneActive) {
    return;
  }

  fillAudioTestToneFrames();

  size_t bytesWritten = 0;
  i2s_write(
    AUDIO_TEST_TONE_PORT,
    audioTestToneFrames,
    sizeof(audioTestToneFrames),
    &bytesWritten,
    pdMS_TO_TICKS(10)
  );
}
#else
void stopAudioTestTone(const String& reason) {
  if (reason.length() > 0) {
    Serial.print("Audio test tone stop ignored: ");
    Serial.println(reason);
  }
}

bool startAudioTestTone() {
  return false;
}

void loopAudioTestTone() {
}
#endif

#if !ENABLE_I2S_TEST_TONE
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
  stopAudioTestTone("");
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
    sizeof(audioStreamBuffer)
  );
  if (audioBufferedSource == nullptr) {
    publishEvent("audio_buffer_allocation_failed");
    stopAudioPlayback("", true);
    return false;
  }

  audioGenerator = new AudioGeneratorMP3(
    audioDecoderWorkspace,
    sizeof(audioDecoderWorkspace)
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
#endif

void syncAudioPlayback() {
  applyAudioVolume();

  if (ENABLE_I2S_TEST_TONE) {
    if (!audioTestToneActive) {
      startAudioTestTone();
    }
    return;
  }

  if (audioTestToneActive) {
    stopAudioTestTone("audio_test_tone_disabled");
  }

#if !ENABLE_I2S_TEST_TONE
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
#endif
}

void setupAudioPlayback() {
#if !ENABLE_I2S_TEST_TONE
  audioLogger = &Serial;
#endif
  desiredAudioSource = "local";
  desiredAudioPlaying = false;
  desiredAudioTrackId = -1;
  desiredAudioVolumePercent = ENABLE_I2S_TEST_TONE ? TEST_TONE_VOLUME_PERCENT : 72;
  currentAudioTrackId = -1;
  audioRetryAtMs = 0;

  if (ENABLE_I2S_TEST_TONE) {
    Serial.println("Audio test tone mode is active. Backend streaming is bypassed.");
  }

  syncAudioPlayback();
}

void handleMediaState(const String& payload) {
#if !ENABLE_I2S_TEST_TONE
  String source = extractJsonString(payload, "source");
  if (source.length() > 0) {
    desiredAudioSource = source;
  }
#endif

#if !ENABLE_I2S_TEST_TONE
  desiredAudioPlaying = extractJsonBool(payload, "isPlaying", desiredAudioPlaying);
  desiredAudioTrackId = extractJsonInt(payload, "activeTrackId", desiredAudioTrackId);
#endif
  desiredAudioVolumePercent = extractJsonInt(
    payload,
    "volumePercent",
    desiredAudioVolumePercent
  );

#if !ENABLE_I2S_TEST_TONE
  Serial.print("Media state -> source=");
  Serial.print(desiredAudioSource);
  Serial.print(", track=");
  Serial.print(desiredAudioTrackId);
  Serial.print(", playing=");
  Serial.print(desiredAudioPlaying ? "true" : "false");
  Serial.print(", volume=");
  Serial.println(desiredAudioVolumePercent);
#else
  Serial.print("Media state ignored in test tone mode, volume=");
  Serial.println(desiredAudioVolumePercent);
#endif

  syncAudioPlayback();
}

void loopAudioPlayback() {
  if (audioTestToneActive) {
    loopAudioTestTone();
    return;
  }

#if !ENABLE_I2S_TEST_TONE
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
#endif
}
