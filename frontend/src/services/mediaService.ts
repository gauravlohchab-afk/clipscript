import type { DownloadFormat, Media, SampleUrls } from '@/types/media';
import { apiClient, request, requestFile } from './apiClient';

export const mediaService = {
  fetch: (url: string) => request<Media>(() => apiClient.post('/media/fetch', { url })),

  download: (url: string, format: DownloadFormat) =>
    requestFile(() => apiClient.post('/media/download', { url, format }, { responseType: 'blob', timeout: 5 * 60_000 })),

  samples: () => request<SampleUrls>(() => apiClient.get('/media/samples')),
};
