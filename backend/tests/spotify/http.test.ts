import { describe, expect, it, vi } from "vitest";
import { fetchSpotifyWithBackoff, parseRetryAfterMs } from "../../src/spotify/http.js";

describe("spotify http retry helpers", () => {
  it("parses Retry-After seconds into milliseconds", () => {
    expect(parseRetryAfterMs("2")).toBe(2_000);
  });

  it("retries 429 responses by honoring the Retry-After header", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: {
            "Retry-After": "1",
          },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const sleepMock = vi.fn(async () => {});

    const response = await fetchSpotifyWithBackoff("https://api.spotify.com/v1/me", {}, {
      fetchImpl: fetchMock,
      sleep: sleepMock,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenCalledWith(1_000);
  });

  it("falls back to exponential delays when Retry-After is missing", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const sleepMock = vi.fn(async () => {});

    const response = await fetchSpotifyWithBackoff("https://api.spotify.com/v1/me/player", {}, {
      fetchImpl: fetchMock,
      sleep: sleepMock,
      baseDelayMs: 250,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleepMock).toHaveBeenNthCalledWith(1, 250);
    expect(sleepMock).toHaveBeenNthCalledWith(2, 500);
  });
});
