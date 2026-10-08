import { connectTestDatabase, disconnectTestDatabase } from './setup.js';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createServices } from '../src/services/bootstrap.js';
import { ClipModel } from '../src/models/Clip.js';

let app: Express;
const REEL = 'https://www.instagram.com/reel/CSdemoEdit03/?utm_source=ig_web';

beforeAll(async () => {
  await connectTestDatabase();
  await ClipModel.syncIndexes();
  app = createApp(createServices({ mode: 'mongodb' }));
});

afterAll(async () => {
  await disconnectTestDatabase();
});

describe('ClipScript API', () => {
  let analysisResult: Record<string, unknown>;
  let clipId: string;

  it('reports health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', providers: { media: 'mock', ai: 'mock' } } });
  });

  it('validates media fetch input with the standard error envelope', async () => {
    const empty = await request(app).post('/api/media/fetch').send({}).expect(400);
    expect(empty.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    await request(app).post('/api/media/fetch').send({ url: 'https://youtube.com/watch?v=1' }).expect(422);
    const priv = await request(app).post('/api/media/fetch').send({ url: 'https://www.instagram.com/reel/CSprivateDemo/' }).expect(403);
    expect(priv.body.error.code).toBe('PRIVATE_CONTENT');
    const removed = await request(app).post('/api/media/fetch').send({ url: 'https://www.instagram.com/reel/CSremovedDemo/' }).expect(404);
    expect(removed.body.error.code).toBe('MEDIA_UNAVAILABLE');
    const badJson = await request(app).post('/api/media/fetch').set('content-type', 'application/json').send('{oops').expect(400);
    expect(badJson.body.message).toBe('The request body is not valid JSON.');
  });

  it('fetches normalized media', async () => {
    const res = await request(app).post('/api/media/fetch').send({ url: REEL }).expect(200);
    expect(res.body.data).toMatchObject({
      platform: 'instagram',
      type: 'reel',
      author: 'editwithmaya',
      originalUrl: 'https://www.instagram.com/reel/CSdemoEdit03/',
      duration: 18,
    });
    expect(res.body.data.downloadOptions.map((o: { format: string }) => o.format)).toEqual(['720p', 'mp3']);
  });

  it('downloads only available formats', async () => {
    const mp3 = await request(app).post('/api/media/download').send({ url: REEL, format: 'mp3' }).buffer(true).expect(200);
    expect(mp3.headers['content-type']).toBe('audio/mpeg');
    expect(mp3.headers['content-disposition']).toMatch(/\.mp3"$/);
    const hd = await request(app).post('/api/media/download').send({ url: REEL, format: '1080p' }).expect(422);
    expect(hd.body.error.code).toBe('FORMAT_UNAVAILABLE');
    // "best" exists only for sub-720p sources; this sample is 720p.
    const best = await request(app).post('/api/media/download').send({ url: REEL, format: 'best' }).expect(422);
    expect(best.body.error.code).toBe('FORMAT_UNAVAILABLE');
    const bogus = await request(app).post('/api/media/download').send({ url: REEL, format: '../etc/passwd' }).expect(400);
    expect(bogus.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('analyzes a reel and returns a schema-valid analysis', async () => {
    const res = await request(app).post('/api/analysis/analyze').send({ url: REEL }).expect(200);
    const { analysis, meta } = res.body.data;
    expect(meta.provider).toBe('mock');
    expect(analysis.transcript.length).toBeGreaterThan(0);
    const starts = analysis.transcript.map((s: { start: number }) => s.start);
    expect([...starts].sort((a: number, b: number) => a - b)).toEqual(starts);
    expect(analysis.hook).toHaveProperty('whyItWorks');
    expect(analysis.onScreenText.length).toBeGreaterThan(0);
    expect(analysis.structure[0].stage).toBe('hook');
    expect(analysis.scores.overall).toBeGreaterThan(0);
    analysisResult = res.body.data;
  });

  it('saves a clip and prevents duplicates', async () => {
    const created = await request(app).post('/api/clips').send(analysisResult).expect(201);
    clipId = created.body.data.id;
    expect(created.body.data.thumbnailData).toMatch(/^data:image\/jpeg;base64,/);
    expect(created.body.data.tags).toContain('hook');
    const duplicate = await request(app).post('/api/clips').send(analysisResult).expect(200);
    expect(duplicate.body.data.id).toBe(clipId);
    expect(duplicate.body.message).toMatch(/already/);
    expect(await ClipModel.countDocuments()).toBe(1);
  });

  it('rejects malformed analysis payloads', async () => {
    const res = await request(app)
      .post('/api/clips')
      .send({ ...analysisResult, analysis: { summary: 'x' } })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists, searches, filters and sorts clips', async () => {
    const all = await request(app).get('/api/clips').expect(200);
    expect(all.body.data.total).toBe(1);
    expect(all.body.data.facets.hookTypes.length).toBe(1);
    expect((await request(app).get('/api/clips').query({ q: 'punch-in' })).body.data.total).toBe(1);
    expect((await request(app).get('/api/clips').query({ q: 'nothing-like-this' })).body.data.total).toBe(0);
    expect((await request(app).get('/api/clips').query({ minScore: 99 })).body.data.total).toBe(0);
    expect((await request(app).get('/api/clips').query({ url: REEL })).body.data.total).toBe(1);
    await request(app).get('/api/clips').query({ sort: 'bogus' }).expect(400);
  });

  it('gets, toggles saved state, and exports a clip', async () => {
    const one = await request(app).get(`/api/clips/${clipId}`).expect(200);
    expect(one.body.data.author).toBe('editwithmaya');

    const removed = await request(app).patch(`/api/clips/${clipId}`).send({ isSaved: false }).expect(200);
    expect(removed.body.data.isSaved).toBe(false);
    expect((await request(app).get('/api/clips').query({ saved: 'true' })).body.data.total).toBe(0);

    const md = await request(app).get(`/api/clips/${clipId}/export/markdown`).expect(200);
    expect(md.headers['content-type']).toMatch(/text\/markdown/);
    expect(md.text).toContain('# Reel Analysis');

    const json = await request(app).get(`/api/clips/${clipId}/export/json`).expect(200);
    const parsed = JSON.parse(json.text);
    expect(parsed.clip.id).toBe(clipId);
    expect(parsed.clip.thumbnailData).toBeUndefined();
    expect(parsed.clip.scores).toHaveProperty('overall');
  });

  it('deletes a clip and returns 404 afterwards', async () => {
    await request(app).delete(`/api/clips/${clipId}`).expect(200);
    const missing = await request(app).get(`/api/clips/${clipId}`).expect(404);
    expect(missing.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
    await request(app).get('/api/clips/not-an-id').expect(404);
    await request(app).get('/api/nope').expect(404);
  });

  it('refuses to proxy non-allowlisted hosts', async () => {
    const res = await request(app).get('/api/media/proxy').query({ src: 'http://169.254.169.254/latest/meta-data' }).expect(400);
    expect(res.body.success).toBe(false);
  });
});
