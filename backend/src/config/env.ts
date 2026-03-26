const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65_535;

export interface AppConfig {
  host: string;
  port: number;
  mediaLibraryPath: string | null;
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

export function buildConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const host = env.HAJUKEBOX_HOST?.trim() || DEFAULT_HOST;
  const rawPort = env.HAJUKEBOX_PORT?.trim();
  const mediaLibraryPath = normalizeMediaLibraryPath(env.MEDIA_LIBRARY_PATH);

  if (!rawPort) {
    return {
      host,
      port: DEFAULT_PORT,
      mediaLibraryPath,
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
  };
}
