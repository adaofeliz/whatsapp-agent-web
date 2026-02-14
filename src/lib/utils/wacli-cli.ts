import { execFile } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { getEnv } from "../env";

const execFileAsync = promisify(execFile);

// JID validation schema: supports both individual (s.whatsapp.net) and group (g.us) chats
const jidSchema = z
  .string()
  .regex(
    /^\d+@(s\.whatsapp\.net|g\.us)$/,
    "Invalid JID format. Expected format: 1234567890@s.whatsapp.net or 123456789@g.us"
  );

const messageSchema = z.string().min(1, "Message cannot be empty");

// Response from wacli send text --json
const wacliSendResponseSchema = z.object({
  sent: z.boolean(),
  to: z.string(),
  id: z.string(),
});

const wacliSendEnvelopeSchema = z.object({
  success: z.boolean().optional(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
});

interface SendMessageResult {
  success: true;
  messageId: string;
}

const supervisorctlArgs = [
  "-c",
  "/etc/supervisor/conf.d/supervisord.conf",
];

/**
 * Sends a WhatsApp message via wacli CLI with proper sync lock management.
 *
 * **Lock Management**:
 * - wacli uses flock for exclusive locking on the WhatsApp store
 * - `wacli sync --follow` holds the lock continuously
 * - `wacli send` requires the lock but will fail if sync holds it
 * - Solution: stop sync → send message → restart sync (always)
 *
 * @param to - WhatsApp JID (e.g., "1234567890@s.whatsapp.net" or "123456789@g.us")
 * @param message - Text message to send
 * @returns SendMessageResult with success status and message ID
 * @throws Error if validation fails, supervisorctl fails, or send fails
 */
export async function sendMessage(
  to: string,
  message: string
): Promise<SendMessageResult> {
  // Validate inputs
  const validatedJid = jidSchema.parse(to);
  const validatedMessage = messageSchema.parse(message);

  const env = getEnv();
  const wacliPath = env.WACLI_BINARY_PATH;
  const wacliStoreDir = env.WACLI_STORE_DIR;
  const timeout = 30000; // 30 seconds

  try {
    // Step 1: Stop wacli-sync to release the lock
    await execFileAsync(
      "supervisorctl",
      [...supervisorctlArgs, "stop", "wacli-sync"],
      {
        timeout,
      }
    );

    // Step 2: Send the message
    const { stdout } = await execFileAsync(
      wacliPath,
      [
        "send",
        "text",
        "--to",
        validatedJid,
        "--message",
        validatedMessage,
        "--store",
        wacliStoreDir,
        "--json",
      ],
      { timeout }
    );

    // Step 3: Parse response
    const parsed = JSON.parse(stdout);
    const envelope = wacliSendEnvelopeSchema.parse(parsed);
    const payload = envelope.data ?? parsed;
    const response = wacliSendResponseSchema.parse(payload);

    if (!response.sent) {
      throw new Error(`Failed to send message to ${validatedJid}`);
    }

    return {
      success: true,
      messageId: response.id,
    };
  } catch (error) {
    // Enhance error message for better debugging
    if (error instanceof Error) {
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
    throw error;
  } finally {
    // Step 4: Always restart wacli-sync, even if send fails
    try {
      await execFileAsync(
        "supervisorctl",
        [...supervisorctlArgs, "start", "wacli-sync"],
        {
          timeout,
        }
      );
    } catch (restartError) {
      // Log but don't throw - we want the original error to propagate
      console.error("Failed to restart wacli-sync:", restartError);
      // Re-throw to ensure caller knows sync is not running
      throw new Error(
        `Critical: wacli-sync failed to restart after send operation. Manual intervention required.`
      );
    }
  }
}
