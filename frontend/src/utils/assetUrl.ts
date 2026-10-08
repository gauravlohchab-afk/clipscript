import { API_URL } from '@/services/apiClient';

const apiOrigin = new URL(API_URL, window.location.origin).origin;

/**
 * Platform CDN assets usually block cross-origin embedding, so anything not served by our own
 * API is routed through the backend's allowlisted media proxy.
 */
export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    if (new URL(url).origin === apiOrigin) return url;
  } catch {
    return null;
  }
  return `${API_URL}/media/proxy?src=${encodeURIComponent(url)}`;
}
