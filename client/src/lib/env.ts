function requiredPublicUrl(name: 'NEXT_PUBLIC_API_URL' | 'NEXT_PUBLIC_SOCKET_URL', fallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }

  return fallback;
}

export const publicEnv = {
  apiUrl: requiredPublicUrl('NEXT_PUBLIC_API_URL', 'http://localhost:5000/api'),
  socketUrl: requiredPublicUrl('NEXT_PUBLIC_SOCKET_URL', 'http://localhost:5000'),
};
