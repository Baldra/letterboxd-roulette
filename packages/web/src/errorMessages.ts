export function messageForStatus(status: number, serverMessage?: string): string {
  switch (status) {
    case 400:
      return serverMessage ?? "That doesn't look like a username or list. Try `username` or `username/list-slug`.";
    case 404:
      return serverMessage ?? 'User or list not found on Letterboxd.';
    case 422:
      return serverMessage ?? 'That list is private or empty.';
    case 429:
      return serverMessage ?? 'Too many spins! Wait a moment, then try again.';
    case 503:
      return serverMessage ?? 'Letterboxd is busy right now. Try again in a moment.';
    case 502:
      return serverMessage ?? 'Something went wrong reaching Letterboxd.';
    default:
      return serverMessage ?? 'Something went wrong. Please try again.';
  }
}