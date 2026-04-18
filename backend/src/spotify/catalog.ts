export interface SpotifyCatalogTrackSummary {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  coverUrl: string | null;
  externalUrl: string | null;
}

export interface SpotifyCatalogPlaylistSummary {
  id: string;
  uri: string;
  name: string;
  description: string | null;
  ownerName: string | null;
  imageUrl: string | null;
  trackCount: number;
  externalUrl: string | null;
}

export interface SpotifyCatalogTrackPage {
  items: SpotifyCatalogTrackSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SpotifyCatalogPlaylistPage {
  items: SpotifyCatalogPlaylistSummary[];
  total: number;
  limit: number;
  offset: number;
}

function asObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getExternalUrl(value: unknown) {
  return asNonEmptyString(asObject(value)?.spotify);
}

function getImageUrl(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const image of value) {
    const url = asNonEmptyString(asObject(image)?.url);

    if (url) {
      return url;
    }
  }

  return null;
}

function normalizeTrackSummary(value: unknown): SpotifyCatalogTrackSummary | null {
  const track = asObject(value);

  if (!track) {
    return null;
  }

  const type = asNonEmptyString(track.type);

  if (type && type !== "track") {
    return null;
  }

  const id = asNonEmptyString(track.id);
  const uri = asNonEmptyString(track.uri);
  const title = asNonEmptyString(track.name);

  if (!id || !uri || !title) {
    return null;
  }

  const album = asObject(track.album);
  const artists = Array.isArray(track.artists) ? track.artists : [];
  const artistNames = artists
    .map((artist) => asNonEmptyString(asObject(artist)?.name))
    .filter((artistName): artistName is string => Boolean(artistName));

  return {
    id,
    uri,
    title,
    artist: artistNames.join(", ") || "Spotify",
    album: asNonEmptyString(album?.name) ?? "Spotify",
    durationMs: asNumber(track.duration_ms),
    coverUrl: getImageUrl(album?.images),
    externalUrl: getExternalUrl(track.external_urls),
  };
}

export function normalizeSpotifySearchTracks(payload: unknown): SpotifyCatalogTrackPage {
  const tracks = asObject(asObject(payload)?.tracks);
  const items = Array.isArray(tracks?.items) ? tracks.items : [];

  return {
    items: items
      .map((item) => normalizeTrackSummary(item))
      .filter((item): item is SpotifyCatalogTrackSummary => Boolean(item)),
    total: asNumber(tracks?.total, 0),
    limit: asNumber(tracks?.limit, items.length),
    offset: asNumber(tracks?.offset, 0),
  };
}

export function normalizeSpotifyPlaylists(payload: unknown): SpotifyCatalogPlaylistPage {
  const page = asObject(payload);
  const items = Array.isArray(page?.items) ? page.items : [];

  return {
    items: items
      .map((item) => {
        const playlist = asObject(item);

        if (!playlist) {
          return null;
        }

        const id = asNonEmptyString(playlist.id);
        const uri = asNonEmptyString(playlist.uri);
        const name = asNonEmptyString(playlist.name);

        if (!id || !uri || !name) {
          return null;
        }

        const owner = asObject(playlist.owner);
        const tracks = asObject(playlist.tracks);

        return {
          id,
          uri,
          name,
          description: asNonEmptyString(playlist.description),
          ownerName:
            asNonEmptyString(owner?.display_name) ?? asNonEmptyString(owner?.id),
          imageUrl: getImageUrl(playlist.images),
          trackCount: asNumber(tracks?.total),
          externalUrl: getExternalUrl(playlist.external_urls),
        } satisfies SpotifyCatalogPlaylistSummary;
      })
      .filter((item): item is SpotifyCatalogPlaylistSummary => Boolean(item)),
    total: asNumber(page?.total, 0),
    limit: asNumber(page?.limit, items.length),
    offset: asNumber(page?.offset, 0),
  };
}

export function normalizeSpotifyPlaylistItems(payload: unknown): SpotifyCatalogTrackPage {
  const page = asObject(payload);
  const items = Array.isArray(page?.items) ? page.items : [];

  return {
    items: items
      .map((entry) => {
        const record = asObject(entry);

        if (!record || record.is_local === true) {
          return null;
        }

        return normalizeTrackSummary(record.track ?? record.item);
      })
      .filter((item): item is SpotifyCatalogTrackSummary => Boolean(item)),
    total: asNumber(page?.total, 0),
    limit: asNumber(page?.limit, items.length),
    offset: asNumber(page?.offset, 0),
  };
}
