import type { FastifyInstance } from "fastify";

interface HealthResponse {
  status: "ok";
  service: "hajukebox-backend";
  timestamp: string;
}

export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/api/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      service: "hajukebox-backend",
      timestamp: new Date().toISOString(),
    };
  });
}
