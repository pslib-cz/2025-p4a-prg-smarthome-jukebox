import { buildConfig } from "./config/env.js";
import { buildApp } from "./app.js";

const config = buildConfig();
const app = buildApp({}, config.mediaLibraryPath, config.mqtt, config.spotify);

async function start() {
  try {
    await app.listen({
      port: config.port,
      host: config.host,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
