import { OpenRouter } from "@openrouter/sdk";
import { getEnv } from "@/lib/env";

let openrouterClient: OpenRouter | null = null;

export function getOpenRouterClient(): OpenRouter {
  if (openrouterClient) {
    return openrouterClient;
  }

  const env = getEnv();

  openrouterClient = new OpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    httpReferer: "https://github.com/yourusername/whatsapp-agent-web",
    xTitle: "WhatsApp Agent Web",
  });

  return openrouterClient;
}
