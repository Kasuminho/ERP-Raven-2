import { getPublicApiUrl } from '@/lib/public-api-url';

export function displayImageUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith('/uploads/')) {
    return `${getPublicApiUrl().replace(/\/api\/v1$/, '')}${url}`;
  }

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) {
    return googleDriveThumbnail(fileMatch[1]);
  }

  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && idMatch?.[1]) {
    return googleDriveThumbnail(idMatch[1]);
  }

  return url;
}

function googleDriveThumbnail(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}
