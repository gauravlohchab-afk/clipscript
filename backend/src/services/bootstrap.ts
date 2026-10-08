import { isDatabaseReady, type DatabaseConnection } from '../config/database.js';
import { AnalysisService } from './ai/analysisService.js';
import { ClipService } from './clips/clipService.js';
import type { AppServices } from './container.js';
import { ExportService } from './export/exportService.js';
import { MediaService } from './media/mediaService.js';
import { createAIProvider, createMediaProvider } from './providerFactory.js';

/** Wires concrete providers into the services. */
export function createServices(database: Pick<DatabaseConnection, 'mode'>): AppServices {
  const media = new MediaService(createMediaProvider());
  const clips = new ClipService(media);
  return {
    media,
    analysis: new AnalysisService(media, createAIProvider()),
    clips,
    exports: new ExportService(clips),
    database: { mode: database.mode, isReady: isDatabaseReady },
  };
}
