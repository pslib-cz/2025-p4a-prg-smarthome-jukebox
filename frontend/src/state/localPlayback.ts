import type { MediaState } from "./jukeboxTypes";
import { buildTrackStreamUrl } from "./backendHttpTransport";

export function getLocalTrackStreamUrl(
  media: Pick<MediaState, "source" | "activeTrackId">,
) {
  if (media.source !== "local") {
    return null;
  }

  if (!Number.isInteger(media.activeTrackId) || media.activeTrackId <= 0) {
    return null;
  }

  return buildTrackStreamUrl(media.activeTrackId);
}
