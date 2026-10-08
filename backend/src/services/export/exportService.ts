import type { ClipDto } from '../../types/clip.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import type { ClipService } from '../clips/clipService.js';
import { clipToMarkdown } from './markdownExporter.js';

export interface ExportFile {
  filename: string;
  contentType: string;
  body: string;
}

const baseName = (clip: ClipDto) =>
  `clipscript-${clip.author}-${clip.shortcode}`.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').slice(0, 80);

export class ExportService {
  constructor(private readonly clips: ClipService) {}

  async markdown(id: string): Promise<ExportFile> {
    const clip = await this.clips.get(id);
    return this.render(() => ({
      filename: `${baseName(clip)}.md`,
      contentType: 'text/markdown; charset=utf-8',
      body: clipToMarkdown(clip),
    }));
  }

  async json(id: string): Promise<ExportFile> {
    const clip = await this.clips.get(id);
    return this.render(() => {
      const { thumbnailData: _thumbnail, ...rest } = clip;
      const document = {
        exportedAt: new Date().toISOString(),
        source: 'ClipScript',
        schemaVersion: 1,
        clip: rest,
      };
      return {
        filename: `${baseName(clip)}.json`,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(document, null, 2),
      };
    });
  }

  private render(build: () => ExportFile): ExportFile {
    try {
      return build();
    } catch (error) {
      logger.error('Export failed', error);
      throw new AppError('EXPORT_FAILED', 'We could not generate this export. Please try again.', { cause: error });
    }
  }
}
