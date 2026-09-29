export function resolveServerEndpoint(
  configured: string | undefined,
  production: boolean,
  hostname: string,
): string {
  if (!configured && production)
    throw new Error('Brak adresu serwera multiplayer.');
  const url = new URL(configured || `http://${hostname}:2567`);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (production && url.protocol !== 'https:')
  ) {
    throw new Error('Nieprawidłowy adres serwera multiplayer.');
  }
  return url.origin;
}

export function getServerEndpoint(): string {
  return resolveServerEndpoint(
    import.meta.env.VITE_SERVER_URL,
    import.meta.env.PROD,
    window.location.hostname,
  );
}

export async function waitForServer(
  endpoint: string,
  signal: AbortSignal,
): Promise<void> {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    const request = new AbortController();
    const abort = () => request.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, Math.min(10000, deadline - Date.now()));
    try {
      const response = await fetch(`${endpoint}/health`, {
        signal: request.signal,
        cache: 'no-store',
      });
      if (
        response.ok &&
        ((await response.json()) as { status?: unknown }).status === 'ok'
      )
        return;
    } catch {
      signal.throwIfAborted();
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
    signal.throwIfAborted();
    const delay = Math.min(2000, deadline - Date.now());
    if (delay > 0)
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }, delay);
        signal.addEventListener('abort', onAbort, { once: true });
      });
  }
  throw new Error('Serwer jest niedostępny. Spróbuj ponownie za chwilę.');
}
