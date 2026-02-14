import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppDb, schema } from "@/lib/db/app";
import { eq } from "drizzle-orm";

/**
 * GET /api/settings/auto-response
 * Returns auto-response configuration for all chats or a specific chat
 *
 * Query params:
 * - chatJid?: string (optional, filter by specific chat)
 *
 * Response (200):
 * - configs: Array<AutoResponseConfig>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatJid = searchParams.get("chatJid");

    const db = getAppDb();

    if (chatJid) {
      const config = await db
        .select()
        .from(schema.autoResponseConfig)
        .where(eq(schema.autoResponseConfig.chat_jid, chatJid))
        .limit(1);

      return NextResponse.json({
        configs: config,
      });
    }

    const configs = await db.select().from(schema.autoResponseConfig);

    return NextResponse.json({
      configs,
    });
  } catch (error) {
    console.error("Failed to fetch auto-response config:", error);
    return NextResponse.json(
      { error: "Failed to fetch auto-response configuration" },
      { status: 500 }
    );
  }
}

const updateConfigSchema = z.object({
  chatJid: z.string().min(1, "Chat JID is required"),
  enabled: z.boolean().optional(),
  styleProfileId: z.number().nullable().optional(),
  requireApproval: z.boolean().optional(),
  maxDailyResponses: z.number().nullable().optional(),
  contextWindowMessages: z.number().optional(),
});

/**
 * POST /api/settings/auto-response
 * Creates or updates auto-response configuration for a chat
 *
 * Request body:
 * - chatJid: string (required)
 * - enabled?: boolean
 * - styleProfileId?: number | null
 * - requireApproval?: boolean
 * - maxDailyResponses?: number | null
 * - contextWindowMessages?: number
 *
 * Response (200):
 * - success: true
 * - config: AutoResponseConfig
 *
 * Response (400):
 * - error: string (validation error)
 *
 * Response (500):
 * - error: string (database error)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = updateConfigSchema.parse(body);

    const db = getAppDb();

    const existing = await db
      .select()
      .from(schema.autoResponseConfig)
      .where(eq(schema.autoResponseConfig.chat_jid, data.chatJid))
      .limit(1);

    if (existing.length > 0) {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.styleProfileId !== undefined)
        updateData.style_profile_id = data.styleProfileId;
      if (data.requireApproval !== undefined)
        updateData.require_approval = data.requireApproval;
      if (data.maxDailyResponses !== undefined)
        updateData.max_daily_responses = data.maxDailyResponses;
      if (data.contextWindowMessages !== undefined)
        updateData.context_window_messages = data.contextWindowMessages;

      await db
        .update(schema.autoResponseConfig)
        .set(updateData)
        .where(eq(schema.autoResponseConfig.chat_jid, data.chatJid));

      const updated = await db
        .select()
        .from(schema.autoResponseConfig)
        .where(eq(schema.autoResponseConfig.chat_jid, data.chatJid))
        .limit(1);

      return NextResponse.json({
        success: true,
        config: updated[0],
      });
    } else {
      const insertData: any = {
        chat_jid: data.chatJid,
        enabled: data.enabled ?? false,
        style_profile_id: data.styleProfileId ?? null,
        require_approval: data.requireApproval ?? true,
        max_daily_responses: data.maxDailyResponses ?? null,
        context_window_messages: data.contextWindowMessages ?? 10,
        daily_response_count: 0,
        daily_count_reset_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.insert(schema.autoResponseConfig).values(insertData);

      const created = await db
        .select()
        .from(schema.autoResponseConfig)
        .where(eq(schema.autoResponseConfig.chat_jid, data.chatJid))
        .limit(1);

      return NextResponse.json({
        success: true,
        config: created[0],
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    console.error("Failed to update auto-response config:", error);
    return NextResponse.json(
      { error: "Failed to update auto-response configuration" },
      { status: 500 }
    );
  }
}
