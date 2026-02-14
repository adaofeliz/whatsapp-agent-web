import { NextResponse } from 'next/server';
import { getWacliDb } from '@/lib/db/wacli';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const supervisorctlArgs = [
  "-c",
  "/etc/supervisor/conf.d/supervisord.conf",
];

type HealthStatus = 'ok' | 'degraded' | 'error';
type WacliSyncStatus = 'running' | 'stopped';

interface HealthResponse {
  status: HealthStatus;
  wacliSync: WacliSyncStatus;
  lastMessageAge: number;
  dbAccessible: boolean;
  timestamp: number;
}

async function checkWacliSyncStatus(): Promise<WacliSyncStatus> {
  try {
    const { stdout } = await execFileAsync(
      "supervisorctl",
      [...supervisorctlArgs, "status", "wacli-sync"]
    );
    return stdout.includes('RUNNING') ? 'running' : 'stopped';
  } catch (error) {
    return 'stopped';
  }
}

async function getLastMessageTimestamp(): Promise<number | null> {
  try {
    const db = getWacliDb();
    const result = db.prepare('SELECT MAX(ts) as last_ts FROM messages').get() as { last_ts: number | null };
    return result.last_ts;
  } catch (error) {
    return null;
  }
}

function calculateStatus(
  dbAccessible: boolean,
  wacliSync: WacliSyncStatus,
  lastMessageAge: number
): HealthStatus {
  if (!dbAccessible) {
    return 'error';
  }
  
  if (wacliSync === 'running' && lastMessageAge < 300) {
    return 'ok';
  }
  
  return 'degraded';
}

export async function GET() {
  const timestamp = Math.floor(Date.now() / 1000);
  let dbAccessible = false;
  let lastMessageAge = Infinity;
  let wacliSync: WacliSyncStatus = 'stopped';

  try {
    const lastMessageTs = await getLastMessageTimestamp();
    dbAccessible = true;
    
    if (lastMessageTs !== null) {
      lastMessageAge = timestamp - lastMessageTs;
    }
  } catch (error) {
    dbAccessible = false;
  }

  try {
    wacliSync = await checkWacliSyncStatus();
  } catch (error) {
    wacliSync = 'stopped';
  }

  const status = calculateStatus(dbAccessible, wacliSync, lastMessageAge);

  const response: HealthResponse = {
    status,
    wacliSync,
    lastMessageAge,
    dbAccessible,
    timestamp,
  };

  return NextResponse.json(response);
}
