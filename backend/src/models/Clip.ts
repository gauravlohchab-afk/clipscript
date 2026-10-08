import { Schema, model, type InferSchemaType } from 'mongoose';

const transcriptSegmentSchema = new Schema(
  { start: { type: Number, required: true }, end: { type: Number, required: true }, text: { type: String, required: true } },
  { _id: false },
);

const onScreenTextSchema = new Schema(
  { timestamp: { type: Number, required: true }, text: { type: String, required: true } },
  { _id: false },
);

const structureSectionSchema = new Schema(
  {
    stage: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    description: { type: String, default: '' },
  },
  { _id: false },
);

const scoreField = { type: Number, min: 0, max: 100, required: true };

const clipSchema = new Schema(
  {
    originalUrl: { type: String, required: true, trim: true },
    shortcode: { type: String, required: true, trim: true },
    platform: { type: String, enum: ['instagram'], default: 'instagram' },
    mediaType: { type: String, enum: ['reel', 'post', 'video'], default: 'reel' },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    author: { type: String, required: true, trim: true, maxlength: 200 },
    thumbnailUrl: { type: String, default: null },
    /** Small JPEG preview (data URL) captured at save time, because platform CDN links expire. */
    thumbnailData: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    duration: { type: Number, default: 0, min: 0 },
    summary: { type: String, default: '' },
    transcript: { type: [transcriptSegmentSchema], default: [] },
    hook: {
      text: { type: String, default: '' },
      type: { type: String, required: true },
      whyItWorks: { type: String, default: '' },
      score: scoreField,
    },
    onScreenText: { type: [onScreenTextSchema], default: [] },
    structure: { type: [structureSectionSchema], default: [] },
    retention: {
      score: scoreField,
      observations: { type: [String], default: [] },
      riskPoints: { type: [String], default: [] },
    },
    cta: {
      text: { type: String, default: '' },
      type: { type: String, required: true },
      score: scoreField,
    },
    keyTakeaways: { type: [String], default: [] },
    scores: {
      hook: scoreField,
      retention: scoreField,
      structure: scoreField,
      cta: scoreField,
      overall: scoreField,
    },
    tags: { type: [String], default: [] },
    /** Whether the clip is pinned to the "Saved Clips" collection (it stays in the library either way). */
    isSaved: { type: Boolean, default: true },
    analysisMeta: {
      provider: { type: String, required: true },
      model: { type: String, required: true },
      analyzedAt: { type: Date, required: true },
    },
  },
  { timestamps: true, versionKey: false },
);

clipSchema.index({ originalUrl: 1 }, { unique: true });
clipSchema.index({ createdAt: -1 });
clipSchema.index({ 'scores.overall': -1 });
clipSchema.index({ 'scores.hook': -1 });
clipSchema.index({ isSaved: 1, createdAt: -1 });
clipSchema.index({ author: 1 });
clipSchema.index({ tags: 1 });

export type ClipFields = InferSchemaType<typeof clipSchema>;

export const ClipModel = model('Clip', clipSchema);
export type ClipDocument = InstanceType<typeof ClipModel>;
