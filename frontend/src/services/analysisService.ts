import type { AnalysisResult } from '@/types/analysis';
import { apiClient, request } from './apiClient';

export const analysisService = {
  analyze: (url: string) =>
    request<AnalysisResult>(() => apiClient.post('/analysis/analyze', { url }, { timeout: 5 * 60_000 })),
};
