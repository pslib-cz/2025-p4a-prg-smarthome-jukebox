import type { FastifyInstance } from "fastify";
import type { HomeAssistantBridgePublisher } from "../homeassistant/mediaBridge.js";
import { createBackendRuntimeHealthSnapshot } from "../runtime/health.js";
import type {
  BackendRuntimeHealthSnapshot,
  BackendSpotifyHealthSnapshot,
} from "../runtime/types.js";
import type { InMemoryMediaService } from "../media/service.js";

export function registerHealthRoutes(
  app: FastifyInstance,
  mediaService: InMemoryMediaService,
  homeAssistantBridge: HomeAssistantBridgePublisher,
  spotifyHealth: BackendSpotifyHealthSnapshot,
) {
  app.get("/api/health", async (): Promise<BackendRuntimeHealthSnapshot> => {
    return createBackendRuntimeHealthSnapshot(
      mediaService.getLibraryHealthSnapshot(),
      homeAssistantBridge.getHealthSnapshot(),
      spotifyHealth,
    );
  });
}
