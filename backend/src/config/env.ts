const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const DEFAULT_MQTT_CLIENT_ID = "hajukebox-backend";
const DEFAULT_MQTT_TOPIC_PREFIX = "jukebox";
const DEFAULT_SPOTIFY_SCOPES = [
  "streaming",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
];
const MIN_PORT = 1;
const MAX_PORT = 65_535;

export interface MqttBridgeConfig {
  brokerUrl: string | null;
  username: string | null;
  password: string | null;
  clientId: string;
  topicPrefix: string;
}

export interface SpotifyConfig {
  clientId: string | null;
  redirectUri: string | null;
  frontendRedirectUri: string | null;
  scopes: string[];
  mockMode: string | null;
}

export interface AppConfig {
  host: string;
  port: number;
  mediaLibraryPath: string | null;
  mqtt: MqttBridgeConfig;
  spotify: SpotifyConfig;
}

export function normalizeMediaLibraryPath(
  rawPath: string | undefined,
  platform: NodeJS.Platform = process.platform,
) {
  const trimmed = rawPath?.trim();

  if (!trimmed) {
    return null;
  }

  if (platform !== "linux") {
    return trimmed;
  }

  const windowsDrivePath = /^([A-Za-z]):[\\/](.*)$/u.exec(trimmed);

  if (!windowsDrivePath) {
    return trimmed;
  }

  const drive = windowsDrivePath[1].toLowerCase();
  const rest = windowsDrivePath[2].replaceAll("\\", "/");

  return `/mnt/${drive}/${rest}`;
}

function parseSpotifyScopes(rawScopes: string | undefined) {
  const scopes = rawScopes
    ?.split(/[\s,]+/u)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);

  if (!scopes || scopes.length === 0) {
    return [...DEFAULT_SPOTIFY_SCOPES];
  }

  return [...new Set(scopes)];
}

export function buildConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const host = env.HAJUKEBOX_HOST?.trim() || DEFAULT_HOST;
  const rawPort = env.HAJUKEBOX_PORT?.trim();
  const mediaLibraryPath = normalizeMediaLibraryPath(env.MEDIA_LIBRARY_PATH);
  const mqttBrokerUrl =
    env.HAJUKEBOX_MQTT_BROKER_URL?.trim() || env.MQTT_BROKER_URL?.trim() || null;
  const mqttUsername =
    env.HAJUKEBOX_MQTT_USERNAME?.trim() || env.MQTT_USERNAME?.trim() || null;
  const mqttPassword =
    env.HAJUKEBOX_MQTT_PASSWORD?.trim() || env.MQTT_PASSWORD?.trim() || null;
  const mqttClientId =
    env.HAJUKEBOX_MQTT_CLIENT_ID?.trim() || DEFAULT_MQTT_CLIENT_ID;
  const mqttTopicPrefix =
    env.HAJUKEBOX_MQTT_TOPIC_PREFIX?.trim() || DEFAULT_MQTT_TOPIC_PREFIX;

  const mqtt: MqttBridgeConfig = {
    brokerUrl: mqttBrokerUrl,
    username: mqttUsername,
    password: mqttPassword,
    clientId: mqttClientId,
    topicPrefix: mqttTopicPrefix,
  };
  const spotify: SpotifyConfig = {
    clientId: env.HAJUKEBOX_SPOTIFY_CLIENT_ID?.trim() || null,
    redirectUri: env.HAJUKEBOX_SPOTIFY_REDIRECT_URI?.trim() || null,
    frontendRedirectUri:
      env.HAJUKEBOX_SPOTIFY_FRONTEND_REDIRECT_URI?.trim() || null,
    scopes: parseSpotifyScopes(env.HAJUKEBOX_SPOTIFY_SCOPES),
    mockMode: env.HAJUKEBOX_SPOTIFY_MOCK_MODE?.trim() || null,
  };

  if (!rawPort) {
    return {
      host,
      port: DEFAULT_PORT,
      mediaLibraryPath,
      mqtt,
      spotify,
    };
  }

  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`Invalid HAJUKEBOX_PORT: ${rawPort}`);
  }

  return {
    host,
    port,
    mediaLibraryPath,
    mqtt,
    spotify,
  };
}
