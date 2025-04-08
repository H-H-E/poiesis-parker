import type { LLM } from "@/types"

const GOOGLE_PLATORM_LINK = "https://generativelanguage.googleapis.com/v1/"

// Google Models (UPDATED 12/22/23) -----------------------------

/*// Gemini Pro (UPDATED 12/22/23)
const GEMINI_PRO: LLM = {
  modelId: "gemini-1.0-pro",
  modelName: "Gemini 1.0 Pro",
  provider: "google",
  hostedId: "gemini-1.0-pro",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: false
}

const GEMINI_PRO_1_5: LLM = {
  modelId: "gemini-1.5-pro-latest",
  modelName: "Gemini 1.5 Pro",
  provider: "google",
  hostedId: "gemini-1.5-pro-latest",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

const GEMINI_PRO_1_5_FLASH: LLM = {
  modelId: "gemini-1.5-flash-latest",
  modelName: "Gemini 1.5 Flash",
  provider: "google",
  hostedId: "gemini-1.5-flash-latest",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}
// Gemini Pro Vision (UPDATED 12/22/23)

const GEMINI_PRO_VISION: LLM = {
  modelId: "gemini-pro-vision",
  modelName: "Gemini Pro Vision",
  provider: "google",
  hostedId: "gemini-pro-vision",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}
*/

const GEMINI_2_5_PRO: LLM = {
  modelId: "gemini-2.5-pro-latest",
  modelName: "Gemini 2.5 Pro",
  provider: "google",
  hostedId: "gemini-2.5-pro-latest",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

const GEMINI_2_0_FLASH: LLM = {
  modelId: "gemini-2.0-flash-latest",
  modelName: "Gemini 2.0 Flash",
  provider: "google",
  hostedId: "gemini-2.0-flash-latest",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

export const GOOGLE_LLM_LIST: LLM[] = [
  GEMINI_2_5_PRO,
  GEMINI_2_0_FLASH
  // GEMINI_PRO_VISION
]
