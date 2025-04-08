import { LLM } from "@/types"

const OPENAI_PLATORM_LINK = "https://platform.openai.com/docs/overview"

// OpenAI Models (UPDATED 1/25/24) -----------------------------

// GPT-4 Turbo (UPDATED 1/25/24)

const GPT4o: LLM = {
  modelId: "gpt-4o",
  modelName: "GPT-4 Omni",
  provider: "openai",
  hostedId: "gpt-4o",
  platformLink: OPENAI_PLATORM_LINK,
  imageInput: true
}

export const OPENAI_LLM_LIST: LLM[] = [GPT4o]
