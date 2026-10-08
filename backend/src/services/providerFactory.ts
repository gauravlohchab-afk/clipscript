import { env, isProduction, maxMediaBytes, publicBaseUrl } from '../config/env.js';
import { ffmpegLocation } from '../utils/ffmpeg.js';
import type { AIProvider } from './ai/aiProvider.js';
import { GeminiProvider } from './ai/geminiService.js';
import { MockAIProvider } from './ai/mockAIProvider.js';
import { InstagramProvider } from './media/instagramProvider.js';
import type { MediaProvider } from './media/mediaProvider.js';
import { MockMediaProvider } from './media/mockMediaProvider.js';
import { YtdlpClient } from './media/ytdlpClient.js';
import { YtdlpProvider } from './media/ytdlpProvider.js';

/**
 * The single place that decides which concrete providers run. Production services only ever
 * see the MediaProvider / AIProvider interfaces.
 */
export function createMediaProvider(): MediaProvider {
  // yt-dlp is the primary extraction engine; "auto" keeps the mock provider for zero-setup local development.
  const choice = env.MEDIA_PROVIDER === 'auto' ? (isProduction ? 'ytdlp' : 'mock') : env.MEDIA_PROVIDER;
  switch (choice) {
    case 'mock':
      return new MockMediaProvider(publicBaseUrl);
    case 'instagram':
      return new InstagramProvider(env.META_OEMBED_TOKEN);
    case 'ytdlp':
      return new YtdlpProvider(
        new YtdlpClient({
          binary: env.YTDLP_PATH,
          ffmpegLocation,
          metadataTimeoutMs: env.YTDLP_METADATA_TIMEOUT_MS,
          downloadTimeoutMs: env.YTDLP_DOWNLOAD_TIMEOUT_MS,
          maxConcurrent: env.YTDLP_MAX_CONCURRENT,
          maxFileBytes: maxMediaBytes,
        }),
      );
  }
}

export function createAIProvider(): AIProvider {
  const wantsGemini = env.AI_PROVIDER === 'gemini' || (env.AI_PROVIDER === 'auto' && (Boolean(env.GEMINI_API_KEY) || isProduction));
  if (wantsGemini) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for the Gemini provider. Set it, or set AI_PROVIDER=mock for local development.');
    }
    return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }
  return new MockAIProvider(env.MOCK_AI_DELAY_MS);
}
