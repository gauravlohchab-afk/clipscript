import mongoose from 'mongoose';
import { env, isProduction } from './env.js';
import { logger } from '../utils/logger.js';

export interface DatabaseConnection {
  mode: 'mongodb' | 'in-memory';
  disconnect: () => Promise<void>;
}

mongoose.set('strictQuery', true);

/**
 * Connects to MONGODB_URI. Outside production, when no URI is configured, falls back to an
 * isolated in-memory MongoDB (mongodb-memory-server, a dev dependency) so the app runs with zero setup.
 */
export async function connectDatabase(): Promise<DatabaseConnection> {
  if (env.MONGODB_URI) {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
    logger.info(`Connected to MongoDB (${mongoose.connection.host}/${mongoose.connection.name})`);
    return { mode: 'mongodb', disconnect: () => mongoose.disconnect() };
  }

  if (isProduction) {
    throw new Error('MONGODB_URI is required in production.');
  }

  const { startInMemoryMongo } = await import('../dev/inMemoryMongo.js');
  const memory = await startInMemoryMongo();
  await mongoose.connect(memory.uri);
  logger.warn('MONGODB_URI is not set: using an in-memory MongoDB. Saved clips are lost when the server stops.');
  return {
    mode: 'in-memory',
    disconnect: async () => {
      await mongoose.disconnect();
      await memory.stop();
    },
  };
}

export const isDatabaseReady = () => mongoose.connection.readyState === 1;
