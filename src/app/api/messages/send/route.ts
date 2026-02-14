import { NextResponse } from "next/server";
import { z } from "zod";
import { sendMessage } from "@/lib/utils/wacli-cli";

// Rate limiting: in-memory store with sliding window
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

/**
 * Simple in-memory rate limiter with sliding window algorithm
 * @param identifier - Client identifier (can be IP, user ID, etc.)
 * @returns true if rate limit exceeded
 */
function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(identifier) || [];

  const validTimestamps = timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(identifier, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  rateLimitStore.set(identifier, validTimestamps);

  return false;
}

// Request body validation schema
const sendMessageSchema = z.object({
  to: z
    .string()
    .min(1, "Recipient JID is required")
    .regex(
      /^\d+@(s\.whatsapp\.net|g\.us)$/,
      "Invalid JID format. Expected format: 1234567890@s.whatsapp.net or 123456789@g.us"
    ),
  message: z.string().min(1, "Message cannot be empty"),
});

/**
 * POST /api/messages/send
 * Sends a WhatsApp message via wacli CLI
 *
 * Request body:
 * - to: WhatsApp JID (e.g., "1234567890@s.whatsapp.net" or "123456789@g.us")
 * - message: Text message to send
 *
 * Response (200):
 * - success: true
 * - messageId: string
 *
 * Response (400):
 * - error: string (validation error)
 *
 * Response (429):
 * - error: "Rate limit exceeded. Maximum 30 requests per minute."
 *
 * Response (500):
 * - error: string (send failure)
 */
export async function POST(request: Request) {
  try {
    const identifier = "global";

    if (isRateLimited(identifier)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 30 requests per minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { to, message } = sendMessageSchema.parse(body);
    const result = await sendMessage(to, message);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
    });
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

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (
      errorMessage.includes("Invalid JID") ||
      errorMessage.includes("cannot be empty")
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Failed to send WhatsApp message:", error);

    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
