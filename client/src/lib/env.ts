function requiredPublicUrl(name: string, value: string | undefined, fallback: string): string {
  if (value && value.length > 0) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }

  return fallback;
}

// NEXT_PUBLIC_* values are inlined at build time only for static `process.env.X` references.
export const publicEnv = {
  apiUrl: requiredPublicUrl(
    'NEXT_PUBLIC_API_URL',
    process.env.NEXT_PUBLIC_API_URL,
    'http://localhost:3000/api',
  ),
  socketUrl: requiredPublicUrl(
    'NEXT_PUBLIC_SOCKET_URL',
    process.env.NEXT_PUBLIC_SOCKET_URL,
    'http://localhost:3000',
  ),
};
