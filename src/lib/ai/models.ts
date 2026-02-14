export type ModelTier = "CHEAP" | "STANDARD" | "PREMIUM";

export type TaskType =
  | "style_analysis"
  | "message_generation"
  | "timing_analysis"
  | "dropout_analysis"
  | "auto_response";

export interface ModelConfig {
  tier: ModelTier;
  modelId: string;
  costPerMillion: number;
}

export const MODELS: Record<ModelTier, ModelConfig> = {
  CHEAP: {
    tier: "CHEAP",
    modelId: "deepseek/deepseek-v3.2",
    costPerMillion: 0.25,
  },
  STANDARD: {
    tier: "STANDARD",
    modelId: "openai/gpt-5.2",
    costPerMillion: 1.25,
  },
  PREMIUM: {
    tier: "PREMIUM",
    modelId: "anthropic/claude-sonnet-4.5",
    costPerMillion: 3.0,
  },
};

export const TASK_TO_MODEL: Record<TaskType, ModelTier> = {
  style_analysis: "PREMIUM",
  message_generation: "STANDARD",
  timing_analysis: "CHEAP",
  dropout_analysis: "CHEAP",
  auto_response: "STANDARD",
};

export function getModelForTask(task: TaskType): ModelConfig {
  const tier = TASK_TO_MODEL[task];
  return MODELS[tier];
}
