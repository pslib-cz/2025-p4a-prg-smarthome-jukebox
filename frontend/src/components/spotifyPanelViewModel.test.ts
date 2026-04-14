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

  it("disables actions when Spotify is not configured", () => {
    const viewModel = buildSpotifyPanelViewModel({
      ...INITIAL_SPOTIFY_STATE,
      configured: false,
    });

    expect(viewModel.statusLabel).toBe("Not Configured");
    expect(viewModel.primaryActionKind).toBe("disabled");
  });

  it("shows loading state while the Web Playback SDK is initializing", () => {
    const viewModel = buildSpotifyPanelViewModel({
      ...INITIAL_SPOTIFY_STATE,
      authStatus: "connected",
      sdkStatus: "loading",
    });

    expect(viewModel.statusLabel).toBe("Initializing");
    expect(viewModel.primaryActionKind).toBe("disabled");
    expect(viewModel.secondaryActionLabel).toBe("Disconnect");
  });

  it("blocks browser playback on free Spotify accounts", () => {
    const viewModel = buildSpotifyPanelViewModel({
      ...INITIAL_SPOTIFY_STATE,
      authStatus: "connected",
      accountTier: "free",
    });

    expect(viewModel.statusLabel).toBe("Premium Required");
    expect(viewModel.primaryActionKind).toBe("disabled");
    expect(viewModel.secondaryActionLabel).toBe("Disconnect");
  });

  it("formats active playback progress for the Spotify preview track", () => {
    expect(getSpotifyTrackProgress(INITIAL_SPOTIFY_STATE)).toBe("1:04 / 3:35");
  });
});
