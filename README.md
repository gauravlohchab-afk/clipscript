# ClipScript

**Turn viral Reels into actionable content intelligence.**

ClipScript is an AI-powered Instagram Reel research tool. Paste a public Reel URL and ClipScript fetches the available media, shows a preview, prepares the video with FFmpeg, and uses a multimodal AI model (Gemini) to produce a structured research dossier: the spoken script with timestamps, the first-3-second hook and why it works, on-screen text, content structure, retention patterns, the CTA, actionable takeaways and scores. Analyses can be saved to a searchable Script Library and exported as Markdown or JSON.

The downloader is the input layer. The product is the research.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Gemini setup](#gemini-setup)
- [Media providers](#media-providers)
- [API documentation](#api-documentation)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)

---

## Features

| Area | What it does |
| --- | --- |
| **Downloader** | URL input with paste button, instant client-side validation, demo links, staged fetch states, video preview, creator/duration/type/resolution, and download buttons for only the formats the source supports (1080p, 720p, best available, MP3). Real Reels are extracted with [yt-dlp](https://github.com/yt-dlp/yt-dlp). |
| **AI script extraction** | Timestamped, near-verbatim transcript. |
| **Hook intelligence** | First-3-second hook text, hook type, why it works, hook score. |
| **Visual intelligence** | On-screen text overlays with timestamps. |
| **Structure analysis** | Whatever sequence the AI detects (hook → problem → insight → proof → CTA, or others), shown as a timeline. |
| **Retention analysis** | Retention score, what keeps viewers, and timestamped drop-off risks. |
| **CTA analysis** | CTA text, type and score. |
| **Key takeaways & scores** | Actionable lessons plus hook / retention / structure / CTA / overall scores (0–100). |
| **Script Library** | Search (titles, creators, hooks, transcripts), filter by hook type and minimum score, sort, open, delete. |
| **Saved Clips** | Your shortlist. "Remove" takes a clip off the shortlist but keeps it in the library; "Delete" removes it entirely. Same `ClipCard` component as the library. |
| **Export** | Copy transcript, copy analysis (Markdown), download Markdown, download JSON. Exporting an unsaved analysis saves it first. |
| **States** | Distinct loading stages (validating, fetching, preparing, extracting audio, analyzing, transcript, hook, visual text, retention, insights, saving), friendly error states with retry, empty states, skeletons. |
| **Responsive** | Desktop, tablet and mobile (collapsible navigation, stacked cards, no horizontal overflow). |

## Architecture

```
Browser (React + Vite)
   │  Axios (centralized client, normalized errors)
   ▼
Express API ──► Controllers (thin, Zod-validated)
                   │
                   ▼
                Services
                ├── MediaService ──► MediaProvider (interface)
                │                     ├── YtdlpProvider       (yt-dlp + FFmpeg, primary)
                │                     ├── InstagramProvider   (public oEmbed / Open Graph only)
                │                     └── MockMediaProvider   (development)
                ├── AnalysisService ─► FFmpeg prep ─► AIProvider (interface)
                │                                      ├── GeminiProvider (multimodal, JSON schema)
                │                                      └── MockAIProvider (development)
                │                     └── normalizeAnalysis + Zod validation
                ├── ClipService ─────► MongoDB (Mongoose `Clip` model)
                └── ExportService ───► Markdown / JSON
```

Key decisions:

- **Providers are isolated.** Production services only see the `MediaProvider` and `AIProvider` interfaces. `services/providerFactory.ts` is the only file that picks concrete implementations. Mock providers and fixtures live in clearly marked development files (`services/*/mock*.ts`, `src/dev/`).
- **AI output is never trusted.** The Gemini response schema is generated from the same Zod contract (`types/analysis.ts`) the backend validates against. `normalizeAnalysis` coerces types, sorts and clamps timestamps, rescales 0–10 scores, fills derivable fields, and rejects anything unrecoverable with a friendly error, so malformed output cannot break the frontend.
- **No permanent media storage.** Videos are processed in a per-request temp directory that is always deleted. Saved clips keep only metadata, the analysis, and a ~20–60 KB JPEG thumbnail (because platform thumbnail links expire).
- **Safe media handling.** Every outbound fetch goes through `guardedFetch`, which re-checks each redirect hop against the provider's host allowlist (SSRF protection). Downloads are size-capped. The media proxy only serves allowlisted image/video/audio content.
- **Standard envelope + centralized errors.** Every JSON response is `{ success, message, data }` or `{ success: false, message, error: { code } }`. Only curated `AppError` messages reach users; everything else becomes a generic message and is logged server-side.

## Tech stack

**Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Axios, React Hook Form, Zod, Lucide React
**Backend:** Node.js, Express 5, TypeScript, MongoDB, Mongoose, Zod, Helmet, express-rate-limit
**AI:** Google Gemini via `@google/genai` (Files API + structured JSON output)
**Media:** FFmpeg / ffprobe (probing, normalizing for AI, 720p/1080p/MP3 exports, thumbnails)
**Testing:** Vitest + Supertest (backend), Vitest (frontend utilities)

## Folder structure

```
clipscript/
├── package.json              # root scripts (dev, build, lint, test) for both apps
├── README.md
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── src/
│   │   ├── server.ts         # bootstrap: env, DB, providers, listen, graceful shutdown
│   │   ├── app.ts            # express app (helmet, cors, limits, routes, errors)
│   │   ├── config/           # env (Zod-validated), database
│   │   ├── controllers/      # thin HTTP handlers
│   │   ├── routes/           # /api/media, /api/analysis, /api/clips, /api/health
│   │   ├── middleware/       # validate, errorHandler, rateLimiter
│   │   ├── models/           # Clip (Mongoose)
│   │   ├── services/
│   │   │   ├── media/        # mediaService, ytdlpProvider/Client/Formats, instagramProvider, mockMediaProvider, mediaProcessor, ...
│   │   │   ├── ai/           # geminiService, mockAIProvider, analysisService, normalizeAnalysis, prompt
│   │   │   ├── clips/        # clipService
│   │   │   ├── export/       # exportService, markdownExporter
│   │   │   ├── providerFactory.ts
│   │   │   └── bootstrap.ts
│   │   ├── types/            # analysis contract (Zod), media, clip, request schemas
│   │   ├── utils/            # AppError, apiResponse, ffmpeg, safeFetch, instagramUrl, logger
│   │   └── dev/              # DEVELOPMENT ONLY: sample reels, FFmpeg sample media, in-memory MongoDB
│   └── tests/                # unit + API integration tests
└── frontend/
    ├── .env.example
    └── src/
        ├── main.tsx, App.tsx
        ├── routes/           # router (lazy-loaded secondary pages)
        ├── layouts/          # AppLayout
        ├── pages/            # Downloader, Library, SavedClips, ClipAnalysis, HowItWorks, NotFound
        ├── components/
        │   ├── layout/       # Navbar (responsive), Footer, Logo
        │   ├── ui/           # Button, Card, Badge, ScoreRing, ErrorState, EmptyState, Toaster, ...
        │   ├── downloader/   # UrlForm, SampleUrls, MediaPreview, ReelPlayer, DownloadActions, progress cards
        │   ├── analysis/     # AnalysisView + Hook/Transcript/OnScreenText/Structure/Retention/CTA/Takeaways/Scores
        │   └── clips/        # ClipCard, ClipGrid, LibraryToolbar
        ├── hooks/            # useReelWorkflow, useClipActions, useClips, useClip, useStagedProgress, ...
        ├── services/         # apiClient (Axios), media/analysis/clip services
        ├── types/            # shared frontend types
        ├── utils/            # formatting, URL validation, dossier mapping, files
        └── assets/
```

## Getting started

### Prerequisites

- **Node.js 20.10+** (22 recommended)
- **FFmpeg** with `ffprobe` on your `PATH` (or set `FFMPEG_PATH` / `FFPROBE_PATH`)
  - macOS: `brew install ffmpeg` · Windows: `winget install Gyan.FFmpeg` · Ubuntu: `sudo apt install ffmpeg`
- **yt-dlp** on your `PATH` (or set `YTDLP_PATH`), needed for real Instagram Reels (`MEDIA_PROVIDER=ytdlp`, the production default)
  - macOS: `brew install yt-dlp` · Windows: `winget install yt-dlp.yt-dlp` · Linux: `pipx install yt-dlp` or the [standalone binary](https://github.com/yt-dlp/yt-dlp#installation)
  - Check both tools: `yt-dlp --version` and `ffmpeg -version`. Open a new terminal after installing so `PATH` is refreshed.
- MongoDB (optional in development, see [Database setup](#database-setup))

### Install and run

```bash
cd clipscript
npm install                      # installs root, backend and frontend dependencies
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev                      # API on http://localhost:5000, web on http://localhost:5173
```

With an empty `backend/.env`, everything runs on development fallbacks: an in-memory MongoDB, the mock media provider (generated sample Reels) and the mock AI provider. Open http://localhost:5173 and click one of the demo links.

To work with real public Instagram Reels locally, install yt-dlp and FFmpeg and set `MEDIA_PROVIDER=ytdlp` in `backend/.env`. The backend logs `[Media] yt-dlp <version> ready` at startup when it can run yt-dlp.

Each app also runs on its own:

```bash
cd backend  && npm run dev       # http://localhost:5000
cd frontend && npm run dev       # http://localhost:5173
```

### Development commands

| Command (root) | What it does |
| --- | --- |
| `npm run dev` | Backend (tsx watch) and frontend (Vite) together |
| `npm run build` | Production build of both apps |
| `npm run start` | Start the built backend |
| `npm run lint` | ESLint for both apps |
| `npm run typecheck` | TypeScript checks for both apps |
| `npm test` | Backend + frontend tests |

## Environment variables

### `backend/.env`

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `PUBLIC_BASE_URL` | `http://localhost:${PORT}` | Public URL of the API (used for development media links) |
| `MONGODB_URI` | _(empty)_ | MongoDB connection string. Empty in development = in-memory DB. **Required in production.** |
| `GEMINI_API_KEY` | _(empty)_ | Gemini API key. Empty in development = mock AI. **Required in production** unless `AI_PROVIDER=mock`. |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Any Gemini model that accepts video input. Older models such as `gemini-2.5-flash` are closed to new API keys. If a model is overloaded ("high demand" errors or no answer), try another, e.g. `gemini-3.6-flash`. Each AI attempt times out after 75 s. |
| `AI_PROVIDER` | `auto` | `auto` (Gemini if a key is set, otherwise mock outside production), `gemini`, `mock` |
| `MEDIA_PROVIDER` | `auto` | `auto` (mock in development, yt-dlp in production), `ytdlp`, `instagram` (legacy oEmbed/Open Graph), `mock` |
| `YTDLP_PATH` | `yt-dlp` | yt-dlp executable name or full path |
| `YTDLP_METADATA_TIMEOUT_MS` | `60000` | Time limit for metadata extraction; the process is killed after this |
| `YTDLP_DOWNLOAD_TIMEOUT_MS` | `240000` | Time limit for a download including the FFmpeg merge |
| `YTDLP_MAX_CONCURRENT` | `2` | Simultaneous yt-dlp processes; up to 4× this many requests wait in a queue, the rest get a "busy" error |
| `FFMPEG_PATH` / `FFPROBE_PATH` | _(PATH)_ | Explicit FFmpeg binaries. `FFMPEG_PATH` is also passed to yt-dlp (`--ffmpeg-location`) |
| `META_OEMBED_TOKEN` | _(empty)_ | Optional Meta app token (`APP_ID|CLIENT_TOKEN`) for Instagram's official oEmbed endpoint |
| `MAX_MEDIA_MB` | `100` | Largest video processed for analysis or download |
| `MOCK_AI_DELAY_MS` | `1200` | Simulated latency for the mock AI provider |

### `frontend/.env`

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the API |

The frontend never holds API keys; all credentials stay on the backend. `.env` files are git-ignored.

## Database setup

- **Development without setup:** leave `MONGODB_URI` empty. The backend starts an in-memory MongoDB via `mongodb-memory-server` (a dev dependency that downloads a MongoDB binary on first run). Data is lost when the server stops.
- **Local MongoDB:** `MONGODB_URI=mongodb://127.0.0.1:27017/clipscript`
- **MongoDB Atlas:** create a free cluster, add a database user, allow your IP, and use the `mongodb+srv://...` connection string.

The `Clip` model (`backend/src/models/Clip.ts`) stores: `originalUrl` (canonical, unique), `shortcode`, `platform`, `mediaType`, `title`, `author`, `thumbnailUrl`, `thumbnailData`, `mediaUrl`, `duration`, `summary`, `transcript`, `hook`, `onScreenText`, `structure`, `retention`, `cta`, `keyTakeaways`, `scores`, `tags`, `isSaved`, `analysisMeta`, `createdAt`, `updatedAt`. Indexes: unique `originalUrl`, `createdAt`, `scores.overall`, `scores.hook`, `isSaved + createdAt`, `author`, `tags`.

## Gemini setup

1. Create an API key at https://aistudio.google.com/apikey.
2. Set `GEMINI_API_KEY` in `backend/.env` (and optionally `GEMINI_MODEL`).
3. Restart the backend. The startup log shows `ai: gemini`.

How analysis works: the backend downloads the Reel into a temp folder, normalizes it with FFmpeg to an H.264 MP4 no larger than 720p, uploads it through the Gemini Files API, and requests JSON constrained by the ClipScript schema. The response is normalized and validated before it is returned, then the temp files and the uploaded Gemini file are deleted.

## Media providers

| Provider | When | Behavior |
| --- | --- | --- |
| `YtdlpProvider` | Production default, or `MEDIA_PROVIDER=ytdlp` | Extracts public Instagram Reels and video posts with yt-dlp. Details below. |
| `MockMediaProvider` | Development default | Serves three generated sample Reels (made with FFmpeg on first use, cached in your OS temp folder). Shortcodes containing `private`, `removed` or `fail` simulate those errors. |
| `InstagramProvider` | `MEDIA_PROVIDER=instagram` | Uses only publicly available data: Instagram's official oEmbed endpoint (with `META_OEMBED_TOKEN`) and the Open Graph tags Instagram exposes on public Reel pages. It never logs in, sends cookies, or attempts to bypass private accounts or platform protections. If Instagram requires a login, the Reel is reported as unavailable. |

To add a provider (for example a licensed media API), implement `MediaProvider` in `backend/src/services/media/` and select it in `services/providerFactory.ts`. Nothing else changes.

### How the yt-dlp provider works

yt-dlp stays behind the existing `MediaProvider` interface; controllers, the analysis pipeline and the frontend never see yt-dlp output.

| File | Role |
| --- | --- |
| `services/media/ytdlpClient.ts` | Runs the executable: argument arrays only (no shell), `--` before the URL, `--ignore-config`, timeouts that kill the whole process tree, a concurrency limit, and mapping of yt-dlp errors to friendly messages |
| `services/media/ytdlpFormats.ts` | Pure logic: normalizes yt-dlp's formats and picks which ones to download for each output |
| `services/media/ytdlpProvider.ts` | `resolve()` builds the normalized media response; `materialize()` downloads media for a download or an analysis |

**Fetch (`POST /api/media/fetch`)**

1. The URL is validated and canonicalized (`utils/instagramUrl.ts`); only `instagram.com/reel|p|tv/<code>` links reach yt-dlp.
2. `yt-dlp --dump-single-json --no-download` reads the metadata. No video is downloaded.
3. Formats are normalized. Instagram returns progressive MP4s (video with sound, but listed with unknown size and codecs) and separate DASH video and audio streams. yt-dlp does not report a duration for Instagram.
4. A quick `ffprobe` of the preview stream fills in the duration, resolution and whether there is sound.
5. The response keeps the existing shape. `mediaUrl` is the Instagram CDN preview stream, which the frontend plays through the existing `/api/media/proxy` (Instagram CDN hosts only, `Range` supported). `downloadOptions` lists only what the streams can produce: `1080p` and `720p` when a stream at least that large exists, `best` for Reels below 720p, and `mp3` only when there is audio.

**Downloads (`POST /api/media/download`)**

The client sends only `{ url, format }`, never a yt-dlp format ID. The backend resolves the Reel again, picks format IDs from what yt-dlp just reported, and runs yt-dlp into a fresh temp workspace:

- **Video:** the smallest stream at or above the requested size, preferring streams with sound, then H.264, then a ready-made MP4 over a merge. If video and audio are separate DASH streams, yt-dlp downloads both and FFmpeg merges them into one MP4 (`-f <video>+<audio> --merge-output-format mp4`). FFmpeg then scales the result down if it is larger than requested.
- **MP3:** the best audio-only stream (or a progressive stream with sound) is downloaded, then converted with FFmpeg (`libmp3lame`).
- **Carousel posts:** the first video item is used (`--playlist-items`).

**Analysis** uses the same download path (a ≤720p MP4 with sound when available). The existing `prepareForAnalysis` and AI pipeline are unchanged.

**FFmpeg** is used to merge DASH streams (called by yt-dlp), probe streams (`ffprobe`), convert to MP3, scale downloads, and prepare analysis input.

**Temporary files.** Each download or analysis gets its own `clipscript-dl-*` / `clipscript-ai-*` folder in the OS temp directory. It is deleted when the response finishes, on errors, and on interrupted downloads. At startup the backend also removes any of these folders older than an hour left by a crash. Nothing is stored in MongoDB except metadata, the analysis and a small thumbnail.

**Limits.** `--max-filesize` is set to `MAX_MEDIA_MB`, yt-dlp processes are killed when they exceed their timeout, and at most `YTDLP_MAX_CONCURRENT` run at once. The existing per-IP rate limits also apply.

**Access.** yt-dlp runs with `--ignore-config`, without cookies or credentials. Content that needs a login is reported as unavailable; ClipScript does not try to get around private accounts or platform protections.

### Common extraction errors

| What the user sees | Code | Typical cause |
| --- | --- | --- |
| Unable to access this Instagram media. The content may be private, unavailable, or require access that ClipScript cannot provide. | `PRIVATE_CONTENT` | Private account, age-restricted post, or Instagram showing a login wall ("empty media response") |
| This Reel does not exist or has been removed. | `MEDIA_UNAVAILABLE` | Deleted post, HTTP 404 |
| This post does not contain a video. | `MEDIA_UNAVAILABLE` | Photo post or photo-only carousel |
| This Reel is not available as 1080P. / The requested format is no longer available… | `FORMAT_UNAVAILABLE` | The Reel has no stream that large, or Instagram changed its formats between fetch and download |
| Instagram took too long to respond. | `MEDIA_FETCH_FAILED` (504) | yt-dlp timed out and was terminated |
| We could not reach Instagram right now. / Instagram is limiting requests right now. | `MEDIA_FETCH_FAILED` | Network problem, Instagram rate limit (HTTP 429), 5xx responses |
| This video is too large for ClipScript to process. | `MEDIA_TOO_LARGE` | Larger than `MAX_MEDIA_MB` |
| We could not process this video. | `MEDIA_PROCESSING_FAILED` | FFmpeg missing or failed while merging or converting |
| Media extraction is not available on the server right now. | `MEDIA_PROCESSING_FAILED` | yt-dlp is not installed or `YTDLP_PATH` is wrong |
| ClipScript is busy processing other media right now. | `RATE_LIMITED` | More simultaneous requests than the yt-dlp queue allows |

The raw yt-dlp output for every failure is logged on the server (`[Media] yt-dlp failed …`) and never sent to the browser.

### Troubleshooting

- **`[Media] yt-dlp was not found` at startup:** install yt-dlp, open a new terminal, and check `yt-dlp --version`. Or set `YTDLP_PATH` to the full path of the executable.
- **"FFmpeg was not found" / merges fail:** install FFmpeg, or set `FFMPEG_PATH` and `FFPROBE_PATH`. Without FFmpeg, yt-dlp cannot merge DASH video and audio.
- **Every public Reel fails with "private or unavailable":** Instagram changes often, so update yt-dlp first (`yt-dlp -U` for the standalone binary, `winget upgrade yt-dlp.yt-dlp`, `brew upgrade yt-dlp` or `pipx upgrade yt-dlp`). Then check the Reel opens in a private browser window without logging in. If it needs a login, ClipScript cannot fetch it.
- **Timeouts on slow networks:** raise `YTDLP_METADATA_TIMEOUT_MS` / `YTDLP_DOWNLOAD_TIMEOUT_MS`.
- **See what yt-dlp returns:** `yt-dlp --ignore-config -J "https://www.instagram.com/reel/<code>/"` prints the same JSON the provider reads, and `-F` lists the formats.

## API documentation

Base URL: `http://localhost:5000/api`

Success: `{ "success": true, "message": "...", "data": { } }`
Error: `{ "success": false, "message": "Human-readable message", "error": { "code": "ERROR_CODE" } }`

| Method | Endpoint | Body / query | Returns |
| --- | --- | --- | --- |
| `GET` | `/health` | | Status, database mode, active providers |
| `POST` | `/media/fetch` | `{ "url" }` | Normalized media: `platform, type, shortcode, originalUrl, title, author, thumbnailUrl, mediaUrl, duration, width, height, hasAudio, downloadOptions, provider` |
| `POST` | `/media/download` | `{ "url", "format": "1080p" \| "720p" \| "best" \| "mp3" }` (must be one of the Reel's `downloadOptions`) | File stream (`Content-Disposition: attachment`) |
| `GET` | `/media/samples` | | Demo URLs for the active provider |
| `GET` | `/media/proxy` | `?src=` | Streams an allowlisted thumbnail/video (supports `Range`) |
| `POST` | `/analysis/analyze` | `{ "url" }` | `{ media, analysis, meta }` where `analysis` matches the schema below |
| `POST` | `/clips` | `{ media, analysis, meta }` | `201` with the saved clip, or `200` with the existing clip if the Reel is already saved |
| `GET` | `/clips` | `q, saved, hookType, tag, minScore, url, sort (newest\|oldest\|overall\|hook\|duration), page, limit` | `{ items, total, page, limit, facets }` |
| `GET` | `/clips/:id` | | Clip with the complete analysis |
| `PATCH` | `/clips/:id` | `{ "isSaved": boolean }` | Add to / remove from Saved Clips |
| `DELETE` | `/clips/:id` | | `{ id }` |
| `GET` | `/clips/:id/export/markdown` | | Markdown file |
| `GET` | `/clips/:id/export/json` | | JSON file with the complete structured analysis |

Analysis schema:

```json
{
  "summary": "...",
  "transcript": [{ "start": 0, "end": 3, "text": "..." }],
  "hook": { "text": "...", "type": "...", "whyItWorks": "...", "score": 0 },
  "onScreenText": [{ "timestamp": 2, "text": "..." }],
  "structure": [{ "stage": "hook", "start": 0, "end": 3, "description": "..." }],
  "retention": { "score": 0, "observations": [], "riskPoints": [] },
  "cta": { "text": "...", "type": "...", "score": 0 },
  "keyTakeaways": [],
  "scores": { "hook": 0, "retention": 0, "structure": 0, "cta": 0, "overall": 0 }
}
```

Error codes: `VALIDATION_ERROR`, `INVALID_URL`, `UNSUPPORTED_URL`, `PRIVATE_CONTENT`, `MEDIA_UNAVAILABLE`, `MEDIA_FETCH_FAILED`, `MEDIA_TOO_LARGE`, `FORMAT_UNAVAILABLE`, `MEDIA_PROCESSING_FAILED`, `AI_FAILED`, `AI_INVALID_RESPONSE`, `DATABASE_ERROR`, `NOT_FOUND`, `EXPORT_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

Rate limits (per IP): 600 requests / 15 min overall, 30 media fetches / min, 30 downloads / 10 min, 15 analyses / 10 min. JSON bodies are limited to 1 MB.

## Testing

```bash
npm test                                    # all tests
cd backend && npm test                      # uses an in-memory MongoDB
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test   # or a real MongoDB
```

Backend tests cover URL parsing, download-format rules, AI output normalization (malformed, 0–10 scale, missing fields), Markdown export, the Gemini schema, and the full API: validation and error envelopes, media fetch, MP3/1080p availability, analysis, save + duplicate prevention, search/filter/sort, saved toggle, Markdown/JSON export, delete, 404s, and proxy allowlisting. The yt-dlp tests (`tests/ytdlp.test.ts`) use fixtures recorded from real yt-dlp output and a fake yt-dlp executable. They cover format classification, 1080p/720p/best/MP3 selection, merging, carousels, metadata normalization, error mapping, missing yt-dlp, missing FFmpeg, file-size limits, timeouts and the concurrency limit, all without network access. Frontend tests cover URL validation.

## Production build

```bash
npm run build
NODE_ENV=production MONGODB_URI=... GEMINI_API_KEY=... CLIENT_URL=https://your-frontend npm start
```

The frontend build output is in `frontend/dist` (static files). Set `VITE_API_URL` at build time to your API URL.

In production the backend refuses to start without `MONGODB_URI`, and without `GEMINI_API_KEY` unless `AI_PROVIDER=mock` is set explicitly.

## Deployment

- **Frontend (Vercel / Netlify):** root `frontend`, build `npm run build`, output `dist`, env `VITE_API_URL=https://your-api/api`. Add an SPA rewrite of all routes to `/index.html`.
- **Backend (Render / Railway / Fly.io):** root `backend`, build `npm install && npm run build`, start `npm start`. Set `NODE_ENV=production`, `MONGODB_URI`, `GEMINI_API_KEY`, `CLIENT_URL`, `PUBLIC_BASE_URL`. FFmpeg and yt-dlp must be available, for example a Docker image with `apt-get install -y ffmpeg` plus the yt-dlp standalone binary in `/usr/local/bin`. Keep yt-dlp up to date, because Instagram extraction breaks when Instagram changes. Allow long request timeouts (analysis can take a minute).
- **Database:** MongoDB Atlas.

## Known limitations

- **Instagram access.** Instagram has no public API for Reel video. yt-dlp extracts what Instagram serves to logged-out visitors, which works for many public Reels. Instagram shows a login wall for some public posts and for heavy traffic from one IP, and those are reported as unavailable. Extraction depends on yt-dlp keeping up with Instagram changes, so keep it updated. A licensed media provider can be plugged in behind `MediaProvider` without other changes.
- **Carousels.** Only the first video in a carousel post is used.
- **Fetch latency.** Each fetch, download and analysis runs yt-dlp afresh (about 4–6 s of metadata extraction), because Instagram media links expire.
- **Expiring media links.** Instagram CDN URLs expire. Saved clips keep a small thumbnail copy, but the video preview of an old clip may stop playing; the analysis itself is unaffected.
- **Synchronous analysis.** `/analysis/analyze` runs within one request (typically under a minute). Very long videos or a busy Gemini quota may need a job queue.
- **Single-user MVP.** No authentication or per-user libraries yet.
- **Analysis progress stages** in the UI are timed indicators while the single request runs, not server-reported progress.
- **mongodb-memory-server** needs to download a MongoDB binary the first time it runs; on restricted networks set `MONGODB_URI` instead.

## Next steps

- Background job queue (BullMQ) with real server-sent progress events.
- User accounts (JWT), per-user libraries, folders and custom tags.
- Compare multiple Reels and trend dashboards across saved clips.
- AI rewrite: generate original scripts and hooks from saved research patterns.
- PDF and Notion/Obsidian exports.

---

ClipScript only supports public content it is permitted to access. Users are responsible for having the rights to download or reuse any media.
