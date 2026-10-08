import { z } from 'zod';

const INSTAGRAM_HOST = /^(www\.|m\.)?(instagram\.com|instagr\.am)$/i;
const REEL_PATH = /^\/(?:[\w.]+\/)?(reels?|p|tv)\/[A-Za-z0-9_-]{5,64}\/?$/;

/** Client-side validation that mirrors the backend rules for instant feedback. */
export const reelUrlSchema = z
  .string()
  .trim()
  .min(1, 'Paste an Instagram Reel URL to get started.')
  .max(2048, 'That URL is too long.')
  .superRefine((value, ctx) => {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'That does not look like a valid URL.' });
      return;
    }
    if (!INSTAGRAM_HOST.test(url.hostname)) {
      ctx.addIssue({ code: 'custom', message: 'Only Instagram Reel links are supported right now.' });
      return;
    }
    if (url.pathname.startsWith('/stories/')) {
      ctx.addIssue({ code: 'custom', message: 'Stories are not supported. Paste a public Reel link.' });
      return;
    }
    if (!REEL_PATH.test(url.pathname.replace(/\/{2,}/g, '/'))) {
      ctx.addIssue({ code: 'custom', message: 'This link is not a Reel. Use Share → Copy link on the Reel.' });
    }
  });

export const reelFormSchema = z.object({ url: reelUrlSchema });
export type ReelFormValues = z.infer<typeof reelFormSchema>;
