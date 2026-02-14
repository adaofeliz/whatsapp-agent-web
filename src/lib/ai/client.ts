import { getOpenRouterClient } from "./openrouter";
import { getModelForTask, type TaskType } from "./models";
import {
  buildStyleAnalysisPrompt,
  buildMessageProposalsPrompt,
  buildTimingAnalysisPrompt,
  buildDropoutAnalysisPrompt,
  buildAutoResponsePrompt,
  type Message,
} from "./prompts";
import { getAppDb, schema } from "@/lib/db/app";
import { sql, eq, and, gt } from "drizzle-orm";

const STYLE_CACHE_HOURS = 24;
const PROPOSAL_CACHE_MINUTES = 5;

interface StyleProfile {
  messageLength: "short" | "medium" | "long";
  formalityLevel: "casual" | "neutral" | "formal";
  emojiUsage: "none" | "low" | "medium" | "high";
  responseSpeed: "quick" | "delayed";
  responseStyle: "terse" | "verbose";
  commonPhrases: string[];
  topics: string[];
  emotionalTone: "warm" | "neutral" | "professional";
  summary: string;
}

interface MessageProposal {
  message: string;
  tone: "friendly" | "professional" | "casual";
  reasoning: string;
}

interface TimingAnalysis {
  averageResponseMinutes: number;
  responseDistribution: {
    fast: number;
    medium: number;
    slow: number;
  };
  activeHours: string[];
  activeDays: string[];
  patterns: string;
}

interface DropoutPoint {
  yourMessage: string;
  timestamp: string;
  possibleReason: string;
  reengagementSuggestion: string;
}

interface DropoutAnalysis {
  dropoutPoints: DropoutPoint[];
  overallPattern: string;
}

interface AutoResponse {
  message: string;
  confidence: number;
  reasoning: string;
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

function parseJsonResponse<T>(content: string): T {
  const normalized = extractJsonContent(content);

  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    const objectStart = normalized.indexOf("{");
    const objectEnd = normalized.lastIndexOf("}");
    const arrayStart = normalized.indexOf("[");
    const arrayEnd = normalized.lastIndexOf("]");

    const hasObject = objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart;
    const hasArray = arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart;

    if (hasObject || hasArray) {
      const useArray = hasArray && (!hasObject || arrayStart < objectStart);
      const start = useArray ? arrayStart : objectStart;
      const end = useArray ? arrayEnd : objectEnd;
      const extracted = normalized.slice(start, end + 1);
      return JSON.parse(extracted) as T;
    }

    if (error instanceof Error) {
      throw new Error(`Failed to parse AI JSON response: ${error.message}`);
    }

    throw error;
  }
}

async function callAI<T>(task: TaskType, prompt: string): Promise<T> {
  const client = getOpenRouterClient();
  const model = getModelForTask(task);

  const response = await client.chat.send({
    chatGenerationParams: {
      model: model.modelId,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      ...(task === "message_generation"
        ? {}
        : { responseFormat: { type: "json_object" } }),
    },
  });

  if ("choices" in response) {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI model");
    }

    const contentString = typeof content === "string" ? content : "";
    if (!contentString) {
      throw new Error("Response content is not a string");
    }

    return parseJsonResponse<T>(contentString);
  }

  throw new Error("Unexpected response format");
}

export async function analyzeStyle(
  contactName: string,
  messages: Message[]
): Promise<StyleProfile> {
  const db = getAppDb();

  const expiryTime = new Date(
    Date.now() - STYLE_CACHE_HOURS * 60 * 60 * 1000
  ).toISOString();

  const cached = await db
    .select()
    .from(schema.styleProfilesCache)
    .where(
      and(
        eq(schema.styleProfilesCache.contact_name, contactName),
        gt(schema.styleProfilesCache.created_at, expiryTime)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return JSON.parse(cached[0].value) as StyleProfile;
  }

  const prompt = buildStyleAnalysisPrompt(contactName, messages);
  const profile = await callAI<StyleProfile>("style_analysis", prompt);

  await db
    .insert(schema.styleProfilesCache)
    .values({
      contact_name: contactName,
      value: JSON.stringify(profile),
      created_at: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: schema.styleProfilesCache.contact_name,
      set: {
        value: JSON.stringify(profile),
        created_at: new Date().toISOString(),
      },
    });

  return profile;
}

export async function generateProposals(
  contactName: string,
  styleProfile: StyleProfile,
  recentMessages: Message[]
): Promise<MessageProposal[]> {
  const db = getAppDb();

  const contextHash = JSON.stringify({
    contact: contactName,
    lastMessage: recentMessages[recentMessages.length - 1],
  });

  const expiryTime = new Date(
    Date.now() - PROPOSAL_CACHE_MINUTES * 60 * 1000
  ).toISOString();

  const cached = await db
    .select()
    .from(schema.messageProposalsCache)
    .where(
      and(
        eq(schema.messageProposalsCache.contact_name, contactName),
        eq(schema.messageProposalsCache.context_hash, contextHash),
        gt(schema.messageProposalsCache.created_at, expiryTime)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return JSON.parse(cached[0].proposals) as MessageProposal[];
  }

  const prompt = buildMessageProposalsPrompt(
    contactName,
    JSON.stringify(styleProfile),
    recentMessages
  );

  const proposals = await callAI<MessageProposal[]>(
    "message_generation",
    prompt
  );

  await db.insert(schema.messageProposalsCache).values({
    contact_name: contactName,
    context_hash: contextHash,
    proposals: JSON.stringify(proposals),
    created_at: new Date().toISOString(),
  });

  return proposals;
}

export async function getCachedTimingAnalysis(
  chatJid: string,
  messageVersionTs: number
): Promise<TimingAnalysis | null> {
  const db = getAppDb();
  const cached = await db
    .select()
    .from(schema.timingAnalysisCache)
    .where(
      and(
        eq(schema.timingAnalysisCache.chat_jid, chatJid),
        eq(schema.timingAnalysisCache.message_version_ts, messageVersionTs)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return JSON.parse(cached[0].value) as TimingAnalysis;
  }
  return null;
}

export async function setCachedTimingAnalysis(
  chatJid: string,
  messageVersionTs: number,
  analysis: TimingAnalysis
): Promise<void> {
  const db = getAppDb();
  await db
    .insert(schema.timingAnalysisCache)
    .values({
      chat_jid: chatJid,
      message_version_ts: messageVersionTs,
      value: JSON.stringify(analysis),
      created_at: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [schema.timingAnalysisCache.chat_jid, schema.timingAnalysisCache.message_version_ts],
      set: {
        value: JSON.stringify(analysis),
        created_at: new Date().toISOString(),
      },
    });
}

export async function getCachedDropoutAnalysis(
  chatJid: string,
  messageVersionTs: number
): Promise<DropoutAnalysis | null> {
  const db = getAppDb();
  const cached = await db
    .select()
    .from(schema.dropoutAnalysisCache)
    .where(
      and(
        eq(schema.dropoutAnalysisCache.chat_jid, chatJid),
        eq(schema.dropoutAnalysisCache.message_version_ts, messageVersionTs)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return JSON.parse(cached[0].value) as DropoutAnalysis;
  }
  return null;
}

export async function setCachedDropoutAnalysis(
  chatJid: string,
  messageVersionTs: number,
  analysis: DropoutAnalysis
): Promise<void> {
  const db = getAppDb();
  await db
    .insert(schema.dropoutAnalysisCache)
    .values({
      chat_jid: chatJid,
      message_version_ts: messageVersionTs,
      value: JSON.stringify(analysis),
      created_at: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [schema.dropoutAnalysisCache.chat_jid, schema.dropoutAnalysisCache.message_version_ts],
      set: {
        value: JSON.stringify(analysis),
        created_at: new Date().toISOString(),
      },
    });
}

export async function analyzeTimingPatterns(
  messages: Message[],
  chatJid?: string,
  messageVersionTs?: number
): Promise<TimingAnalysis> {
  if (chatJid && messageVersionTs) {
    const cached = await getCachedTimingAnalysis(chatJid, messageVersionTs);
    if (cached) {
      return cached;
    }
  }

  const prompt = buildTimingAnalysisPrompt(messages);
  const analysis = await callAI<TimingAnalysis>("timing_analysis", prompt);

  if (chatJid && messageVersionTs) {
    await setCachedTimingAnalysis(chatJid, messageVersionTs, analysis);
  }

  return analysis;
}

export async function analyzeDropouts(
  messages: Message[],
  chatJid?: string,
  messageVersionTs?: number
): Promise<DropoutAnalysis> {
  if (chatJid && messageVersionTs) {
    const cached = await getCachedDropoutAnalysis(chatJid, messageVersionTs);
    if (cached) {
      return cached;
    }
  }

  const prompt = buildDropoutAnalysisPrompt(messages);
  const analysis = await callAI<DropoutAnalysis>("dropout_analysis", prompt);

  if (chatJid && messageVersionTs) {
    await setCachedDropoutAnalysis(chatJid, messageVersionTs, analysis);
  }

  return analysis;
}

export async function generateAutoResponse(
  contactName: string,
  styleProfile: StyleProfile,
  recentMessages: Message[],
  context: string
): Promise<AutoResponse> {
  const prompt = buildAutoResponsePrompt(
    contactName,
    JSON.stringify(styleProfile),
    recentMessages,
    context
  );
  return callAI<AutoResponse>("auto_response", prompt);
}
