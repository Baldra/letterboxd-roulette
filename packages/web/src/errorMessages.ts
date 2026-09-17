const UNIFIED_ERROR_MESSAGE = "Nothing found — the list may be empty, private, or doesn't exist.";
const RATE_LIMIT_MESSAGE = 'Too many spins! Wait a moment, then try again.';

export function messageForStatus(status: number, serverMessage?: string): string {
  if (status === 429) {
    return serverMessage ?? RATE_LIMIT_MESSAGE;
  }
  return UNIFIED_ERROR_MESSAGE;
}