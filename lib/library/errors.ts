export class OfflineError extends Error {
  constructor(message = 'You need internet to change the library.') {
    super(message);
    this.name = 'OfflineError';
  }
}

const NETWORK_RE = /network request failed|failed to fetch|fetch failed|network error|load failed/i;

/** True when an error (thrown or returned by supabase-js) means the network is unreachable. */
export function isNetworkError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { message?: unknown; status?: unknown; code?: unknown };
  if (typeof err.message === 'string' && NETWORK_RE.test(err.message)) return true;
  if (err.status === 0) return true;
  if (e instanceof TypeError) return true;
  // supabase error object with neither HTTP status nor PostgREST code
  return err.status === undefined && !err.code && !(e instanceof Error);
}
