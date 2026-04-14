import Fastify, { type FastifyServerOptions } from "fastify";
import type { AppConfig, MqttBridgeConfig } from "./config/env.js";
import {
  createHomeAssistantBridgePublisher,
  isHomeAssistantBridgePublisher,
  type HomeAssistantBridgePublisher,
} from "./homeassistant/mediaBridge.js";
import { InMemoryMediaService } from "./media/service.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMediaRoutes } from "./routes/media.js";
import { registerSpotifyRoutes } from "./routes/spotify.js";
import { createSpotifyService } from "./spotify/service.js";
import { isSpotifyService, type SpotifyService } from "./spotify/types.js";

export function buildApp(
  options: FastifyServerOptions = {},
  mediaLibraryPath: AppConfig["mediaLibraryPath"] = null,
  bridgeConfigOrPublisher: MqttBridgeConfig | HomeAssistantBridgePublisher | null = null,
  spotifyConfigOrService: AppConfig["spotify"] | SpotifyService = {
    clientId: null,
    redirectUri: null,
    frontendRedirectUri: null,
    scopes: [],
    mockMode: null,
  },
) {
  const app = Fastify({
    logger: true,
    ...options,
  });

  const mediaService = new InMemoryMediaService(mediaLibraryPath);
  const homeAssistantBridge = isHomeAssistantBridgePublisher(bridgeConfigOrPublisher)
    ? bridgeConfigOrPublisher
    : createHomeAssistantBridgePublisher(app.log, bridgeConfigOrPublisher, {
        onRuntimeLog(entry) {
          mediaService.recordRuntimeEvent(entry.action, entry.message, {
            level: entry.level,
            domain: "haBridge",
          });
        },
      });

  const spotifyService = isSpotifyService(spotifyConfigOrService)
    ? spotifyConfigOrService
    : createSpotifyService(spotifyConfigOrService);

  registerHealthRoutes(
    app,
    mediaService,
    homeAssistantBridge,
    spotifyService.getHealthSnapshot(),
  );
  registerMediaRoutes(app, mediaService, homeAssistantBridge);
  registerSpotifyRoutes(app, spotifyService, mediaService, homeAssistantBridge);

  app.addHook("onReady", async () => {
    void homeAssistantBridge.publishStartup(mediaService.getState()).catch((error) => {
      mediaService.recordRuntimeEvent(
        "haBridge.startup_publish_failed",
        error instanceof Error ? error.message : String(error),
        {
          level: "warn",
          domain: "haBridge",
        },
      );
      app.log.warn({ err: error }, "Failed to publish HA media bridge startup snapshot");
    });
  });

  app.addHook("onClose", async () => {
    await homeAssistantBridge.close();
  });

  return app;
}
