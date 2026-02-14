export interface Message {
  fromMe: boolean;
  body: string;
  timestamp: number;
}

export function buildStyleAnalysisPrompt(
  contactName: string,
  messages: Message[]
): string {
  const messageWindow = messages.slice(-100);

  const formattedMessages = messageWindow
    .map((msg) => {
      const sender = msg.fromMe ? "You" : contactName;
      const date = new Date(msg.timestamp * 1000).toLocaleString();
      return `[${date}] ${sender}: ${msg.body}`;
    })
    .join("\n");

  return `Analyze the communication style of ${contactName} based on the last 100 messages.

Messages:
${formattedMessages}

Provide a detailed style profile including:
- Typical message length (short/medium/long)
- Formality level (casual/neutral/formal)
- Emoji usage frequency (none/low/medium/high)
- Response patterns (quick/delayed, terse/verbose)
- Common phrases or expressions
- Conversation topics and interests
- Emotional tone (warm/neutral/professional)

Return your analysis as a JSON object with the following structure:
{
  "messageLength": "short" | "medium" | "long",
  "formalityLevel": "casual" | "neutral" | "formal",
  "emojiUsage": "none" | "low" | "medium" | "high",
  "responseSpeed": "quick" | "delayed",
  "responseStyle": "terse" | "verbose",
  "commonPhrases": ["phrase1", "phrase2"],
  "topics": ["topic1", "topic2"],
  "emotionalTone": "warm" | "neutral" | "professional",
  "summary": "brief summary of overall communication style"
}`;
}

export function buildMessageProposalsPrompt(
  contactName: string,
  styleProfile: string,
  recentMessages: Message[]
): string {
  const messageWindow = recentMessages.slice(-20);

  const formattedMessages = messageWindow
    .map((msg) => {
      const sender = msg.fromMe ? "You" : contactName;
      return `${sender}: ${msg.body}`;
    })
    .join("\n");

  return `Generate 3 message proposals to respond to ${contactName}.

Style Profile:
${styleProfile}

Recent Conversation:
${formattedMessages}

Generate 3 diverse message options that:
1. Match ${contactName}'s communication style
2. Are contextually appropriate
3. Maintain natural conversation flow
4. Vary in tone (e.g., friendly, professional, casual)

Return as JSON array:
[
  {
    "message": "proposed message text",
    "tone": "friendly" | "professional" | "casual",
    "reasoning": "brief explanation of why this message fits"
  }
]`;
}

export function buildTimingAnalysisPrompt(messages: Message[]): string {
  const messageWindow = messages.slice(-200);

  const formattedMessages = messageWindow
    .map((msg) => {
      const sender = msg.fromMe ? "You" : "Contact";
      const date = new Date(msg.timestamp * 1000).toLocaleString();
      return `[${date}] ${sender}`;
    })
    .join("\n");

  return `Analyze response timing patterns in this conversation.

Message Timeline:
${formattedMessages}

Identify:
- Average response time from contact
- Response time distribution (fast/medium/slow)
- Time-of-day patterns (when are they most active?)
- Days-of-week patterns
- Any notable gaps or changes in response behavior

Return as JSON:
{
  "averageResponseMinutes": number,
  "responseDistribution": {
    "fast": number,
    "medium": number,
    "slow": number
  },
  "activeHours": ["hour ranges when most active"],
  "activeDays": ["days when most active"],
  "patterns": "description of notable patterns"
}`;
}

export function buildDropoutAnalysisPrompt(messages: Message[]): string {
  const messageWindow = messages.slice(-50);

  const formattedMessages = messageWindow
    .map((msg) => {
      const sender = msg.fromMe ? "You" : "Contact";
      const date = new Date(msg.timestamp * 1000).toLocaleString();
      return `[${date}] ${sender}: ${msg.body}`;
    })
    .join("\n");

  return `Analyze conversation dropouts and identify when the contact stopped responding.

Recent Messages:
${formattedMessages}

Identify:
- Messages where contact stopped responding
- Possible reasons for dropout (boring topic, closed question, bad timing, etc.)
- Patterns in dropout scenarios
- Suggestions for re-engagement

Return as JSON:
{
  "dropoutPoints": [
    {
      "yourMessage": "the message text",
      "timestamp": "timestamp",
      "possibleReason": "why they might have stopped responding",
      "reengagementSuggestion": "how to restart conversation"
    }
  ],
  "overallPattern": "description of dropout patterns"
}`;
}

export function buildAutoResponsePrompt(
  contactName: string,
  styleProfile: string,
  recentMessages: Message[],
  context: string
): string {
  const messageWindow = recentMessages.slice(-10);

  const formattedMessages = messageWindow
    .map((msg) => {
      const sender = msg.fromMe ? "You" : contactName;
      return `${sender}: ${msg.body}`;
    })
    .join("\n");

  return `Generate an automatic response to ${contactName}.

Style Profile:
${styleProfile}

Recent Conversation:
${formattedMessages}

Context: ${context}

Generate a single, natural response that:
1. Matches ${contactName}'s communication style
2. Addresses their most recent message appropriately
3. Maintains conversation flow
4. Is contextually appropriate

Return as JSON:
{
  "message": "the response message",
  "confidence": number between 0-1,
  "reasoning": "brief explanation"
}`;
}
