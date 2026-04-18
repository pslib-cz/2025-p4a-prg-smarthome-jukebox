const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;

export function parseRetryAfterMs(
  value: string | null,
  now = Date.now(),
): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const seconds = Number(trimmed);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const dateMs = Date.parse(trimmed);

  if (Number.isNaN(dateMs)) {
    return null;
  }

  return Math.max(0, dateMs - now);
}

export async function fetchSpotifyWithBackoff(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    fetchImpl?: typeof fetch;
    sleep?: (delayMs: number) => Promise<void>;
  } = {},
) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs);
      }));

  let attempt = 0;

  while (true) {
    const response = await fetchImpl(input, init);

    if (response.status !== 429 || attempt >= maxRetries) {
      return response;
    }

    const retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
    const delayMs = retryAfterMs ?? baseDelayMs * 2 ** attempt;

    attempt += 1;
    await sleep(delayMs);
  }
}
