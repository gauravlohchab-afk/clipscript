import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.MEDIA_PROVIDER = 'mock';
process.env.AI_PROVIDER = 'mock';
process.env.MOCK_AI_DELAY_MS = '0';
process.env.PORT = '5099';
process.env.PUBLIC_BASE_URL = 'http://localhost:5099';

let stopMemory: (() => Promise<void>) | null = null;

/** Uses TEST_MONGODB_URI when provided, otherwise an in-memory MongoDB. */
export async function connectTestDatabase(): Promise<void> {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    const { startInMemoryMongo } = await import('../src/dev/inMemoryMongo.js');
    const memory = await startInMemoryMongo();
    uri = memory.uri;
    stopMemory = memory.stop;
  }
  const dbName = `clipscript_test_${Date.now()}`;
  await mongoose.connect(uri, { dbName });
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect();
  await stopMemory?.();
}
