import type { AnalysisService } from './ai/analysisService.js';
import type { ClipService } from './clips/clipService.js';
import type { ExportService } from './export/exportService.js';
import type { MediaService } from './media/mediaService.js';

export interface AppServices {
  media: MediaService;
  analysis: AnalysisService;
  clips: ClipService;
  exports: ExportService;
  database: { mode: 'mongodb' | 'in-memory'; isReady: () => boolean };
}
