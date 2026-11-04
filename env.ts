import { defineEnv, number, string } from 'void/env';

export default defineEnv({
  // Meta Model API key from the dev.meta.ai dashboard. Optional: without a
  // key, famuse answers with its built-in local assistant so the demo keeps
  // working offline.
  MODEL_API_KEY: string().optional(),
  // OpenAI-compatible base URL for the Meta Model API.
  MODEL_API_BASE_URL: string().default('https://api.meta.ai/v1'),
  // Default chat model for the famuse butler.
  MODEL_API_MODEL: string().default('muse-spark-1.3'),
  // Outbound request budget for AI replies inside a room.
  MODEL_API_TIMEOUT_MS: number().default(30000),
});
