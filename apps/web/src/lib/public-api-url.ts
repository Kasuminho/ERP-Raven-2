export function getPublicApiUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    if (hostname === 'app.guild-g3x.com.br') {
      return 'https://api.guild-g3x.com.br/api/v1';
    }

    if (hostname.startsWith('app.')) {
      return `${protocol}//${hostname.replace(/^app\./, 'api.')}/api/v1`;
    }
  }

  return 'http://localhost:3000/api/v1';
}
