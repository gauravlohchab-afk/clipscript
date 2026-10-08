type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = process.env.NODE_ENV === 'test' ? 'warn' : process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function log(level: Level, message: string, meta?: unknown): void {
  if (order[level] < order[minLevel]) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`;
  const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta === undefined) writer(line);
  else writer(line, meta instanceof Error ? (meta.stack ?? meta.message) : meta);
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};
