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
      responseFormat: { type: "json_object" },
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

    return JSON.parse(contentString) as T;
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

export async function analyzeTimingPatterns(
  messages: Message[]
): Promise<TimingAnalysis> {
  const prompt = buildTimingAnalysisPrompt(messages);
  return callAI<TimingAnalysis>("timing_analysis", prompt);
}

export async function analyzeDropouts(
  messages: Message[]
): Promise<DropoutAnalysis> {
  const prompt = buildDropoutAnalysisPrompt(messages);
  return callAI<DropoutAnalysis>("dropout_analysis", prompt);
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
