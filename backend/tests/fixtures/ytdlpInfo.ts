/**
 * Trimmed `yt-dlp --dump-single-json` output for public Instagram media, captured with yt-dlp 2026.08.19.
 * CDN URLs are replaced with placeholders; field shapes and quirks are kept as yt-dlp reports them:
 * numbered progressive formats with unknown size/codecs, separate DASH video and audio, no duration.
 */
const cdn = (name: string) => `https://scontent.cdninstagram.com/v/${name}.mp4`;

const progressive = (id: string, acodec?: 'none') => ({
  format_id: id,
  url: cdn(`progressive-${id}`),
  protocol: 'https',
  ext: 'mp4',
  ...(acodec ? { acodec } : {}),
});

const dashVideo = (id: string, width: number, height: number, tbr: number, vcodec = 'avc1.4d401f') => ({
  format_id: `dash-${id}v`,
  url: cdn(`dash-${id}v`),
  protocol: 'https',
  ext: 'mp4',
  width,
  height,
  tbr,
  vcodec,
  acodec: 'none',
});

/** A 720×1280 Reel with sound: progressive MP4s plus DASH video ladder and one DASH audio stream. */
export const reelWithAudio = {
  _type: 'video',
  id: 'CDUMkliABpa',
  title: 'Video by clippedinandfree',
  description: 'I definitely need a mountain lake close by to practice SUP\n#sup #mountains',
  channel: 'clippedinandfree',
  uploader: 'Alina Jäger',
  thumbnail: 'https://scontent.cdninstagram.com/v/thumb.jpg',
  formats: [
    { format_id: 'dash-125a', url: cdn('dash-125a'), protocol: 'https', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', tbr: 131.5 },
    progressive('1'),
    progressive('2'),
    dashVideo('171', 240, 426, 122.7),
    dashVideo('822', 504, 896, 953.8),
    dashVideo('331', 720, 1280, 1795.6),
  ],
};

/** A silent 720×1280 Reel: yt-dlp marks the progressive streams `acodec: none` and reports no DASH audio. */
export const silentReel = {
  _type: 'video',
  id: 'Chunk8-jurw',
  title: 'Video by instagram',
  description: '“Gingerton”\n\n@august_thegingercat loves dressing up',
  channel: 'instagram',
  thumbnail: 'https://scontent.cdninstagram.com/v/thumb2.jpg',
  formats: [progressive('0', 'none'), dashVideo('747', 472, 840, 102.9), dashVideo('841', 720, 1280, 3140.6)],
};

/** A 1080×1920 Reel with sound, including a VP9 rendition at the same size. */
export const fullHdReel = {
  _type: 'video',
  id: 'FullHd1080',
  title: 'Video by creator',
  channel: 'creator',
  thumbnail: 'https://scontent.cdninstagram.com/v/thumb3.jpg',
  formats: [
    { format_id: 'dash-9a', url: cdn('dash-9a'), protocol: 'https', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', tbr: 128 },
    progressive('1'),
    dashVideo('720', 720, 1280, 1500),
    dashVideo('1080vp9', 1080, 1920, 2600, 'vp09.00.40.08'),
    dashVideo('1080', 1080, 1920, 3000),
  ],
};

/** A carousel post: a playlist whose first entry is an image (no formats) and second a video. */
export const carouselPost = {
  _type: 'playlist',
  id: 'BQ0eAlwhDrw',
  entries: [
    { _type: 'url', id: 'image1' },
    { ...silentReel, id: 'BQ0dTpOhuHT', description: 'Surprise! Swipe left' },
  ],
};
