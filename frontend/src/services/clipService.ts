import type { AnalysisResult } from '@/types/analysis';
import type { Clip, ClipList, ClipListParams } from '@/types/clip';
import { apiClient, request, requestFile } from './apiClient';

export const clipService = {
  save: (result: AnalysisResult) => request<Clip>(() => apiClient.post('/clips', result)),
  list: (params: ClipListParams = {}) => request<ClipList>(() => apiClient.get('/clips', { params })),
  get: (id: string) => request<Clip>(() => apiClient.get(`/clips/${encodeURIComponent(id)}`)),
  setSaved: (id: string, isSaved: boolean) => request<Clip>(() => apiClient.patch(`/clips/${encodeURIComponent(id)}`, { isSaved })),
  remove: (id: string) => request<{ id: string }>(() => apiClient.delete(`/clips/${encodeURIComponent(id)}`)),
};

export type ExportFormat = 'markdown' | 'json';

export const exportService = {
  file: (id: string, format: ExportFormat) =>
    requestFile(() => apiClient.get(`/clips/${encodeURIComponent(id)}/export/${format}`, { responseType: 'blob' })),
  markdownText: async (id: string) => (await exportService.file(id, 'markdown')).blob.text(),
};
