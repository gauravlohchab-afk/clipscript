import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface TempWorkspace {
  dir: string;
  file: (name: string) => string;
  cleanup: () => Promise<void>;
}

/** Prefixes of per-request workspaces (downloads, analysis, thumbnails). Never matches the dev media cache. */
const WORKSPACE_PREFIXES = ['clipscript-dl-', 'clipscript-ai-', 'clipscript-thumb-'];

/**
 * Removes per-request workspaces left behind by a crash or killed process. Normal requests clean up
 * after themselves; this only catches what an abrupt shutdown leaves. Returns how many were removed.
 */
export async function sweepStaleWorkspaces(maxAgeMs = 60 * 60 * 1000): Promise<number> {
  const root = tmpdir();
  let removed = 0;
  for (const name of await readdir(root).catch(() => [] as string[])) {
    if (!WORKSPACE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    const dir = path.join(root, name);
    try {
      if (Date.now() - (await stat(dir)).mtimeMs < maxAgeMs) continue;
      await rm(dir, { recursive: true, force: true });
      removed += 1;
    } catch {
      // Already gone or in use; try again next time.
    }
  }
  return removed;
}

/** Creates an isolated temp directory for one request; always call cleanup() in a finally block. */
export async function createTempWorkspace(prefix = 'clipscript-'): Promise<TempWorkspace> {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  return {
    dir,
    file: (name: string) => path.join(dir, path.basename(name)),
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
