import { describe, expect, it } from "vitest";
import { INITIAL_SPOTIFY_STATE } from "../spotifySketchData";
import {
  buildSpotifyPanelViewModel,
  getSpotifyTrackProgress,
} from "./spotifyPanelViewModel";

describe("buildSpotifyPanelViewModel", () => {
  it("shows connect action for a disconnected account", () => {
    const viewModel = buildSpotifyPanelViewModel(INITIAL_SPOTIFY_STATE);

    expect(viewModel.primaryActionKind).toBe("authorize");
    expect(viewModel.primaryActionLabel).toBe("Connect Spotify");
    expect(viewModel.timeline.every((step) => !step.complete)).toBe(true);
  });

  it("shows transfer action after the SDK is ready", () => {
    const readyState = {
      ...INITIAL_SPOTIFY_STATE,
      authStatus: "connected" as const,
      sdkStatus: "ready" as const,
      deviceId: "spotify-web-player-1",
    };

    const viewModel = buildSpotifyPanelViewModel(readyState);

    expect(viewModel.primaryActionKind).toBe("transfer");
    expect(viewModel.secondaryActionLabel).toBe("Disconnect");
    expect(viewModel.timeline[1].complete).toBe(true);
    expect(viewModel.timeline[2].complete).toBe(false);
  });

  it("formats active playback progress for the Spotify preview track", () => {
    expect(getSpotifyTrackProgress(INITIAL_SPOTIFY_STATE)).toBe("1:04 / 3:35");
  });
});
