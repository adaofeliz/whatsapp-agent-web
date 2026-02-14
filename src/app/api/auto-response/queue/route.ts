import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppDb, schema } from "@/lib/db/app";
import { eq, and } from "drizzle-orm";
import { sendMessage } from "@/lib/utils/wacli-cli";
import { listMessages, getContact } from "@/lib/db/wacli";

/**
 * GET /api/auto-response/queue
 * Returns pending approval queue items
 *
 * Query params:
 * - status?: 'pending' | 'approved' | 'rejected' | 'expired' (default: 'pending')
 * - limit?: number (default: 50)
 *
 * Response (200):
 * - items: Array<ApprovalQueueItem & { message: Message | null, contact: Contact | null }>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const db = getAppDb();

    const items = await db
      .select()
      .from(schema.approvalQueue)
      .where(eq(schema.approvalQueue.status, status as any))
      .orderBy(schema.approvalQueue.created_at)
      .limit(limit);

    const itemsWithDetails = items.map((item) => {
      const messages = listMessages({
        chatJid: item.chat_jid,
        msgId: item.trigger_message_id,
        limit: 1,
      });
      const message = messages[0] || null;
      const contact = getContact(item.chat_jid);

      return {
        ...item,
        message,
        contact,
      };
    });

    return NextResponse.json({
      items: itemsWithDetails,
    });
  } catch (error) {
    console.error("Failed to fetch approval queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval queue" },
      { status: 500 }
    );
  }
}

const queueActionSchema = z.object({
  id: z.number(),
  action: z.enum(["approve", "reject"]),
  editedText: z.string().optional(),
});

/**
 * POST /api/auto-response/queue
 * Approves or rejects a queued auto-response
 *
 * Request body:
 * - id: number (queue item ID)
 * - action: 'approve' | 'reject'
 * - editedText?: string (optional, overrides proposed response)
 *
 * Response (200):
 * - success: true
 * - messageId?: string (if approved and sent)
 *
 * Response (400):
 * - error: string (validation error)
 *
 * Response (404):
 * - error: string (item not found)
 *
 * Response (500):
 * - error: string (database/send error)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, action, editedText } = queueActionSchema.parse(body);

    const db = getAppDb();

    const queueItem = await db
      .select()
      .from(schema.approvalQueue)
      .where(
        and(
          eq(schema.approvalQueue.id, id),
          eq(schema.approvalQueue.status, "pending")
        )
      )
      .limit(1);

    if (queueItem.length === 0) {
      return NextResponse.json(
        { error: "Queue item not found or already processed" },
        { status: 404 }
      );
    }

    const item = queueItem[0];

    if (action === "approve") {
      const responseText = editedText || item.proposed_response;
      const result = await sendMessage(
        item.chat_jid,
        responseText
      );

      await db
        .update(schema.approvalQueue)
        .set({
          status: "approved",
          resolved_at: new Date().toISOString(),
          proposed_response: responseText,
        })
        .where(eq(schema.approvalQueue.id, id));

      await db.insert(schema.autoResponseLog).values({
        chat_jid: item.chat_jid,
        trigger_message_id: item.trigger_message_id,
        response_message_id: result.messageId,
        style_profile_id: item.style_profile_id,
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        approved: true,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      await db
        .update(schema.approvalQueue)
        .set({
          status: "rejected",
          resolved_at: new Date().toISOString(),
        })
        .where(eq(schema.approvalQueue.id, id));

      return NextResponse.json({
        success: true,
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

    console.error("Failed to process approval queue action:", error);
    return NextResponse.json(
      { error: "Failed to process approval queue action" },
      { status: 500 }
    );
  }
}
