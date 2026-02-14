import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getAppDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const env = getEnv();
  
  const sqlite = new Database(env.APP_DB_PATH);
  
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('cache_size = -64000');
  sqlite.pragma('temp_store = memory');
  sqlite.pragma('foreign_keys = ON');

  dbInstance = drizzle(sqlite, { schema });
  return dbInstance;
}

export { schema };
