import fs from "node:fs";
import path from "node:path";

function parseEnvFile(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");

        if (separator < 0) {
          return [line, ""];
        }

        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

export function readHomeAssistantRuntimeConfig() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing frontend runtime env at ${envPath}`);
  }

  const env = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  const baseUrl = env.VITE_HA_BASE_URL?.trim();
  const token = env.VITE_HA_TOKEN?.trim();

  if (!baseUrl || !token) {
    throw new Error("Missing VITE_HA_BASE_URL or VITE_HA_TOKEN in .env.local");
  }

  return {
    baseUrl,
    token,
  };
}
