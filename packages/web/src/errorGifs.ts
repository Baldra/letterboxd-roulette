export type ErrorReason =
  | 'invalid-input'
  | 'not-found'
  | 'empty-or-private'
  | 'rate-limited'
  | 'upstream'
  | 'offline';

const REASON_BY_STATUS: Record<number, ErrorReason> = {
  400: 'invalid-input',
  404: 'not-found',
  422: 'empty-or-private',
  429: 'rate-limited',
  502: 'upstream',
  503: 'upstream',
};

export function classifyError(status: number): ErrorReason {
  return REASON_BY_STATUS[status] ?? 'offline';
}

export function localGifUrl(reason: ErrorReason): string {
  return `/gifs/${reason}.gif`;
}

export async function randomGifUrl(
  reason: ErrorReason,
  timeoutMs = 1500,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/gif?reason=${encodeURIComponent(reason)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { url?: string };
    return body.url ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}