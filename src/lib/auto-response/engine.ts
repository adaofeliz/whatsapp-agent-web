import { getAppDb, schema } from "@/lib/db/app";
import { getWacliDb } from "@/lib/db/wacli";
import { eq, and, sql } from "drizzle-orm";
import { generateAutoResponse, analyzeStyle } from "@/lib/ai/client";
import { sendMessage } from "@/lib/utils/wacli-cli";

interface ProcessMessageResult {
  action: "sent" | "queued" | "skipped";
  reason: string;
  messageId?: string;
  queueId?: number;
}

export async function processIncomingMessage(
  chatJid: string,
  messageId: string,
  messageText: string,
  timestamp: number
): Promise<ProcessMessageResult> {
  const appDb = getAppDb();

  const globalKillSwitch = await appDb
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "auto_response_enabled"))
    .limit(1);

  if (
    globalKillSwitch.length === 0 ||
    globalKillSwitch[0].value !== "true"
  ) {
    return {
      action: "skipped",
      reason: "Global auto-response disabled",
    };
  }

  if (chatJid.endsWith("@g.us")) {
    return {
      action: "skipped",
      reason: "Group chats not supported",
    };
  }

  const config = await appDb
    .select()
    .from(schema.autoResponseConfig)
    .where(eq(schema.autoResponseConfig.chat_jid, chatJid))
    .limit(1);

  if (config.length === 0 || !config[0].enabled) {
    return {
      action: "skipped",
      reason: "Auto-response not enabled for this chat",
    };
  }

  const chatConfig = config[0];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (
    !chatConfig.daily_count_reset_at ||
    new Date(chatConfig.daily_count_reset_at) < todayStart
  ) {
    await appDb
      .update(schema.autoResponseConfig)
      .set({
        daily_response_count: 0,
        daily_count_reset_at: todayStart.toISOString(),
      })
      .where(eq(schema.autoResponseConfig.chat_jid, chatJid));

    chatConfig.daily_response_count = 0;
  }

  if (
    chatConfig.max_daily_responses !== null &&
    chatConfig.daily_response_count >= chatConfig.max_daily_responses
  ) {
    return {
      action: "skipped",
      reason: "Daily response limit reached",
    };
  }

  const pendingCount = await appDb
    .select({ count: sql<number>`count(*)` })
    .from(schema.approvalQueue)
    .where(
      and(
        eq(schema.approvalQueue.chat_jid, chatJid),
        eq(schema.approvalQueue.status, "pending")
      )
    );

  const totalPending = Number(pendingCount[0]?.count || 0);

  if (totalPending >= 3) {
    return {
      action: "skipped",
      reason: "Too many pending approvals",
    };
  }

  const wacliDb = getWacliDb();
  const recentMessages = wacliDb
    .prepare(
      `
    SELECT msg_id, sender_jid, ts, from_me, text
    FROM messages
    WHERE chat_jid = ?
    ORDER BY ts DESC
    LIMIT ?
  `
    )
    .all(chatJid, chatConfig.context_window_messages) as any[];

  const contact = wacliDb
    .prepare("SELECT push_name, full_name FROM contacts WHERE jid = ?")
    .get(chatJid) as any;

  const contactName =
    contact?.push_name || contact?.full_name || chatJid.split("@")[0];

  const styleProfile = await analyzeStyle(
    contactName,
    recentMessages.map((m) => ({
      body: m.text || "",
      fromMe: m.from_me === 1,
      timestamp: m.ts,
    }))
  );

  const aiResponse = await generateAutoResponse(
    contactName,
    styleProfile,
    recentMessages.map((m) => ({
      body: m.text || "",
      fromMe: m.from_me === 1,
      timestamp: m.ts,
    })),
    `Incoming message: "${messageText}"`
  );

  if (aiResponse.confidence <= 0.7) {
    return {
      action: "skipped",
      reason: `AI confidence too low (${aiResponse.confidence})`,
    };
  }

  const approvedCount = await appDb
    .select({ count: sql<number>`count(*)` })
    .from(schema.autoResponseLog)
    .where(
      and(
        eq(schema.autoResponseLog.chat_jid, chatJid),
        eq(schema.autoResponseLog.approved, true)
      )
    );

  const totalApproved = Number(approvedCount[0]?.count || 0);

  if (chatConfig.require_approval || totalApproved < 3) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await appDb
      .insert(schema.approvalQueue)
      .values({
        chat_jid: chatJid,
        trigger_message_id: messageId,
        proposed_response: aiResponse.message,
        style_profile_id: chatConfig.style_profile_id,
        status: "pending",
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        resolved_at: null,
      })
      .returning({ id: schema.approvalQueue.id });

    return {
      action: "queued",
      reason: "Requires approval (first 3 messages or approval required)",
      queueId: result[0].id,
    };
  }

  const sendResult = await sendMessage(chatJid, aiResponse.message);

  await appDb
    .update(schema.autoResponseConfig)
    .set({
      daily_response_count: chatConfig.daily_response_count + 1,
    })
    .where(eq(schema.autoResponseConfig.chat_jid, chatJid));

  await appDb.insert(schema.autoResponseLog).values({
    chat_jid: chatJid,
    trigger_message_id: messageId,
    response_message_id: sendResult.messageId,
    style_profile_id: chatConfig.style_profile_id,
    prompt_tokens: 0,
    completion_tokens: 0,
    cost_usd: 0,
    approved: false,
    created_at: new Date().toISOString(),
  });

  return {
    action: "sent",
    reason: "Auto-response sent successfully",
    messageId: sendResult.messageId,
  };
}
