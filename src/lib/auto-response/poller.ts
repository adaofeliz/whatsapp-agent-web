import { getAppDb, schema } from "@/lib/db/app";
import { getWacliDb } from "@/lib/db/wacli";
import { eq } from "drizzle-orm";
import { processIncomingMessage } from "./engine";

const POLL_INTERVAL_MS = 10000;
let pollerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

async function getLastCheckedTimestamp(): Promise<number> {
  const appDb = getAppDb();

  const setting = await appDb
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "auto_response_last_check_ts"))
    .limit(1);

  if (setting.length === 0) {
    return 0;
  }

  return parseInt(setting[0].value, 10);
}

async function updateLastCheckedTimestamp(timestamp: number): Promise<void> {
  const appDb = getAppDb();

  await appDb
    .insert(schema.settings)
    .values({
      key: "auto_response_last_check_ts",
      value: timestamp.toString(),
      updated_at: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: {
        value: timestamp.toString(),
        updated_at: new Date().toISOString(),
      },
    });
}

async function pollForNewMessages() {
  if (isProcessing) {
    console.log("[auto-response poller] Already processing, skipping poll");
    return;
  }

  isProcessing = true;

  try {
    const lastCheckedTs = await getLastCheckedTimestamp();
    const wacliDb = getWacliDb();

    const newMessages = wacliDb
      .prepare(
        `
      SELECT msg_id, chat_jid, text, ts
      FROM messages
      WHERE from_me = 0
        AND ts > ?
        AND chat_jid LIKE '%@s.whatsapp.net'
        AND text IS NOT NULL
        AND text != ''
      ORDER BY ts ASC
      LIMIT 100
    `
      )
      .all(lastCheckedTs) as Array<{
      msg_id: string;
      chat_jid: string;
      text: string;
      ts: number;
    }>;

    if (newMessages.length === 0) {
      console.log("[auto-response poller] No new messages");
      return;
    }

    console.log(
      `[auto-response poller] Found ${newMessages.length} new message(s)`
    );

    for (const message of newMessages) {
      try {
        const result = await processIncomingMessage(
          message.chat_jid,
          message.msg_id,
          message.text,
          message.ts
        );

        console.log(
          `[auto-response poller] Processed ${message.msg_id}: ${result.action} - ${result.reason}`
        );
      } catch (error) {
        console.error(
          `[auto-response poller] Failed to process message ${message.msg_id}:`,
          error
        );
      }
    }

    const maxTs = Math.max(...newMessages.map((m) => m.ts));
    await updateLastCheckedTimestamp(maxTs);
  } catch (error) {
    console.error("[auto-response poller] Poll failed:", error);
  } finally {
    isProcessing = false;
  }
}

export function startPoller(): void {
  if (pollerInterval !== null) {
    console.log("[auto-response poller] Already running");
    return;
  }

  console.log(
    `[auto-response poller] Starting (interval: ${POLL_INTERVAL_MS}ms)`
  );

  pollForNewMessages();

  pollerInterval = setInterval(() => {
    pollForNewMessages();
  }, POLL_INTERVAL_MS);
}

export function stopPoller(): void {
  if (pollerInterval === null) {
    console.log("[auto-response poller] Not running");
    return;
  }

  console.log("[auto-response poller] Stopping");
  clearInterval(pollerInterval);
  pollerInterval = null;
}

export function isPollerRunning(): boolean {
  return pollerInterval !== null;
}
