import type { DownloadFormat, ResolvedMedia } from '../../types/media.js';
import type { ParsedInstagramUrl } from '../../utils/instagramUrl.js';
import type { TempWorkspace } from '../../utils/tempFiles.js';

/** What a materialized file is for: a user download in a given format, or input for AI analysis. */
export type MaterializePurpose = DownloadFormat | 'analysis';

/**
 * Contract every media provider implements. Providers turn a validated Reel URL into
 * normalized metadata plus an internal pointer to the media bytes.
 *
 * Providers must only access content that is publicly available to the application
 * and must never attempt to bypass authentication, private accounts or access controls.
 */
export interface MediaProvider {
  readonly name: string;
  resolve(target: ParsedInstagramUrl): Promise<ResolvedMedia>;
  /** Whether a remote asset (thumbnail/video) URL may be fetched or proxied by the backend. */
  isAllowedAssetUrl(url: URL): boolean;
  /** Maps an asset URL this provider serves itself to a local file, so the backend never fetches its own URLs. */
  localAssetPath?(url: URL): string | null;
  /**
   * Writes the media for `purpose` into the workspace and returns the file path. Providers that
   * download through an external tool (yt-dlp) implement this; others use the generic source download.
   */
  materialize?(resolved: ResolvedMedia, purpose: MaterializePurpose, workspace: TempWorkspace): Promise<string>;
  /** Logs a warning at startup when the provider's external dependencies are missing. */
  verifySetup?(): Promise<void>;
  /** Example URLs that work with this provider (shown in the UI). */
  sampleUrls(): string[];
}
