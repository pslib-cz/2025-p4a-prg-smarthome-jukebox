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
        new Response(JSON.stringify({ source: "local", activeTrackId: 1 }), {
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
      );

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await createBackendHttpTransport().loadSnapshot();

    expect(snapshot.connectionStatus).toBe("connected");
    expect(snapshot.media?.source).toBe("local");
    expect(snapshot.library?.songs).toHaveLength(1);
    expect(snapshot.eventLog?.[0].action).toBe("library.scanned");
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

  it("builds a stable local track stream url", () => {
    expect(buildTrackStreamUrl(7)).toBe("/api/library/tracks/7/stream");
  });
});
