/**
 * DEVELOPMENT ONLY. Starts a throwaway MongoDB server in memory when MONGODB_URI is not configured.
 * `mongodb-memory-server` is a devDependency and downloads a MongoDB binary on first use.
 */
export async function startInMemoryMongo(): Promise<{ uri: string; stop: () => Promise<void> }> {
  let MongoMemoryServer: typeof import('mongodb-memory-server').MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = await import('mongodb-memory-server'));
  } catch (error) {
    throw new Error('MONGODB_URI is not set and mongodb-memory-server is not installed. Set MONGODB_URI or run "npm install".', {
      cause: error,
    });
  }
  try {
    const server = await MongoMemoryServer.create();
    return { uri: server.getUri('clipscript'), stop: async () => void (await server.stop()) };
  } catch (error) {
    throw new Error(
      `Could not start the in-memory MongoDB (it downloads a MongoDB binary on first run). Set MONGODB_URI instead. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}
