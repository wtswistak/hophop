export function readAllowedOrigins(
  value: string | undefined,
  production: boolean,
): Set<string> | undefined {
  if (!value?.trim()) {
    if (production)
      throw new Error('ALLOWED_ORIGINS is required in production');
    return undefined;
  }
  return new Set(
    value.split(',').map((entry) => {
      const origin = entry.trim();
      const url = new URL(origin);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.origin !== origin ||
        (production && url.protocol !== 'https:')
      ) {
        throw new Error(
          'ALLOWED_ORIGINS must contain exact origins without paths (HTTPS in production)',
        );
      }
      return origin;
    }),
  );
}

export function isOriginAllowed(
  origin: string | null,
  allowed: Set<string> | undefined,
): boolean {
  // Native clients and Render health checks do not send Origin. This is not authentication.
  return origin === null || allowed === undefined || allowed.has(origin);
}
