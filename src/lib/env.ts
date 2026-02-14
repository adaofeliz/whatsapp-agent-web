import { z } from "zod";

const envSchema = z.object({
  MASTER_PASSWORD_HASH: z.string().min(1, "MASTER_PASSWORD_HASH is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  OPENROUTER_API_KEY: z.string().default(""),
  WACLI_DB_PATH: z.string().min(1, "WACLI_DB_PATH is required"),
  WACLI_STORE_DIR: z.string().min(1, "WACLI_STORE_DIR is required"),
  WACLI_BINARY_PATH: z.string().min(1, "WACLI_BINARY_PATH is required"),
  APP_DB_PATH: z.string().min(1, "APP_DB_PATH is required"),
});

type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `${key}: ${messages?.join(", ")}`)
      .join("\n");

    throw new Error(
      `Environment validation failed:\n${errorMessages}\n\nPlease check your .env file and ensure all required variables are set.`
    );
  }

  validatedEnv = result.data;
  return validatedEnv;
}
