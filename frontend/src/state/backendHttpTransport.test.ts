import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTrackStreamUrl,
  createBackendHttpTransport,
} from "./backendHttpTransport";

const fetchMock = vi.fn<typeof fetch>();

describe("backendHttpTransport", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("loads a combined backend snapshot from the API endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "degraded",
            service: "hajukebox-backend",
            timestamp: "2026-01-01T00:00:00Z",
            dependencies: {
              mediaLibrary: { status: "ready" },
              haBridge: {
                status: "disabled",
                reason: "Home Assistant MQTT bridge is not configured.",
              },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ source: "local", activeTrackId: 1, availability: { overall: "ready" } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, title: "Track", artist: "Artist", album: "Album", duration: "01:00" }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, name: "Library", songCount: 1 }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, time: "2026-01-01T00:00:00Z", action: "library.scanned", meta: "Loaded 1 track" }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            configured: true,
            authenticated: true,
            authStatus: "connected",
            accountTier: "premium",
            scopes: ["streaming"],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            sdkStatus: "ready",
            transferStatus: "active",
            deviceId: "spotify-web-player-1",
            deviceName: "HAJukeBox Web Player",
            isActiveDevice: true,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await createBackendHttpTransport().loadSnapshot();

    expect(snapshot.connectionStatus).toBe("connected");
    expect(snapshot.health?.status).toBe("degraded");
    expect(snapshot.media?.source).toBe("local");
    expect(snapshot.library?.songs).toHaveLength(1);
    expect(snapshot.spotifySession?.authStatus).toBe("connected");
    expect(snapshot.spotifyPlayback?.deviceId).toBe("spotify-web-player-1");
    expect(snapshot.eventLog?.[0].action).toBe("library.scanned");
    expect(snapshot.eventLog?.[0].meta).toBe("Loaded 1 track");
  });

  it("surfaces structured backend request errors", async () => {
    fetchMock.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "dependency_unavailable",
            message: "Backend media dependency is unavailable.",
          },
        }),
        { status: 503 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(createBackendHttpTransport().loadSnapshot()).rejects.toThrow(
      "Backend media dependency is unavailable.",
    );
  });

  it("sends commands to the backend command endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createBackendHttpTransport().sendCommand({ type: "play" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/media/command",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("surfaces structured backend command errors", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "command_conflict",
            message: "Cannot skip because the queue is empty.",
          },
        }),
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createBackendHttpTransport().sendCommand({ type: "next" }),
    ).rejects.toThrow("Cannot skip because the queue is empty.");
  });

  it("builds a stable local track stream url", () => {
    expect(buildTrackStreamUrl(7)).toBe("/api/library/tracks/7/stream");
  });
});
