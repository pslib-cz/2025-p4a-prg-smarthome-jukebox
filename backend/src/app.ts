import Fastify, { type FastifyServerOptions } from "fastify";
import type { AppConfig } from "./config/env.js";
import { InMemoryMediaService } from "./media/service.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMediaRoutes } from "./routes/media.js";

export function buildApp(
  options: FastifyServerOptions = {},
  mediaLibraryPath: AppConfig["mediaLibraryPath"] = null,
) {
  const app = Fastify({
    logger: true,
    ...options,
  });

  const mediaService = new InMemoryMediaService(mediaLibraryPath);

  registerHealthRoutes(app);
  registerMediaRoutes(app, mediaService);

  return app;
}
