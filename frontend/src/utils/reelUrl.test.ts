import { describe, expect, it } from 'vitest';
import { reelUrlSchema } from './reelUrl';

describe('reelUrlSchema', () => {
  it.each([
    'https://www.instagram.com/reel/C9abcDEF12/',
    'instagram.com/reel/C9abcDEF12',
    'https://www.instagram.com/reels/C9abcDEF12/?igsh=xyz',
    'https://www.instagram.com/p/C9abcDEF12/',
    'https://www.instagram.com/someuser/reel/C9abcDEF12/',
  ])('accepts %s', (url) => {
    expect(reelUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    '',
    'not a url',
    'https://www.tiktok.com/@a/video/123',
    'https://www.instagram.com/stories/someone/123/',
    'https://www.instagram.com/someuser/',
  ])('rejects %s', (url) => {
    expect(reelUrlSchema.safeParse(url).success).toBe(false);
  });
});
