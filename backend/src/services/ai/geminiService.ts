import { createPartFromUri, FileState, GoogleGenAI, type File as GeminiFile } from '@google/genai';
import { z } from 'zod';
import { analysisSchema } from '../../types/analysis.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import type { AIProvider, AnalysisInput } from './aiProvider.js';
import { buildAnalysisPrompt } from './prompt.js';

const FILE_POLL_INTERVAL_MS = 2_000;
const FILE_POLL_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 2;
/**
 * Per-attempt limit for generateContent. Overloaded models can accept a request and never answer;
 * without a limit the analysis request would hang. Upload polling (120 s) plus two attempts stays
 * within the frontend's 5-minute analysis timeout.
 */
const GENERATE_TIMEOUT_MS = 75_000;

const isTimeout = (error: unknown) => error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');

/** JSON Schema derived from the same Zod contract we validate against, so the two never drift. */
export function buildResponseSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(analysisSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gemini multimodal provider: uploads the prepared video through the Files API and asks the model
 * for structured JSON constrained by the ClipScript analysis schema.
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;
  private readonly responseSchema = buildResponseSchema();

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async analyze(input: AnalysisInput): Promise<unknown> {
    let uploaded: GeminiFile | undefined;
    try {
      uploaded = await this.upload(input.video.path, input.video.mimeType);
      const prompt = buildAnalysisPrompt(input);

      let lastError: unknown;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await this.client.models.generateContent({
            model: this.model,
            contents: [
              {
                role: 'user',
                parts: [createPartFromUri(uploaded.uri ?? '', uploaded.mimeType ?? input.video.mimeType), { text: prompt }],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseJsonSchema: this.responseSchema,
              temperature: 0.4,
              abortSignal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
            },
          });
          const text = response.text;
          if (!text) throw new Error('Gemini returned an empty response');
          return JSON.parse(text) as unknown;
        } catch (error) {
          lastError = error;
          logger.warn(
            `Gemini analysis attempt ${attempt} failed`,
            isTimeout(error) ? `no response from ${this.model} within ${GENERATE_TIMEOUT_MS / 1000}s` : error instanceof Error ? error.message : error,
          );
        }
      }
      throw lastError;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (isTimeout(error)) {
        throw new AppError('AI_FAILED', 'The AI took too long to respond. It may be busy right now; please try again in a minute.', { cause: error });
      }
      throw new AppError('AI_FAILED', 'The AI could not analyze this Reel right now. Please try again in a minute.', {
        cause: error,
      });
    } finally {
      if (uploaded?.name) {
        this.client.files.delete({ name: uploaded.name }).catch((error: unknown) => logger.warn('Could not delete Gemini file', error));
      }
    }
  }

  private async upload(path: string, mimeType: string): Promise<GeminiFile> {
    let file = await this.client.files.upload({ file: path, config: { mimeType } });
    const deadline = Date.now() + FILE_POLL_TIMEOUT_MS;

    while (file.state === FileState.PROCESSING) {
      if (Date.now() > deadline) throw new Error('Gemini file processing timed out');
      await sleep(FILE_POLL_INTERVAL_MS);
      file = await this.client.files.get({ name: file.name ?? '' });
    }
    if (file.state === FileState.FAILED || !file.uri) {
      throw new Error('Gemini could not process the uploaded video');
    }
    return file;
  }
}
