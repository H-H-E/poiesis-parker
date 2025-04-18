import { ChatOpenAI } from "@langchain/openai"
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate
} from "@langchain/core/prompts"
import { JsonOutputFunctionsParser } from "langchain/output_parsers"
import { zodToJsonSchema } from "zod-to-json-schema"
import { extractedFactsSchema } from "./schemas" // Adjust path if needed
import type { BaseMessage } from "@langchain/core/messages"
import { createFactExtractionChain } from "./fact-extraction-chain" // Import from new file

/**
 * ============================================================================
 * Fact Extraction Subsystem
 * ============================================================================
 *
 * Overview:
 * ----------
 * This module is responsible for extracting structured information ("facts")
 * from unstructured conversation text using a Large Language Model (LLM)
 * enhanced with OpenAI's Function Calling feature for reliable output formatting.
 *
 * Key Components:
 * --------------
 * 1.  `createFactExtractionChain` (from ./fact-extraction-chain): Builds the
 *     LangChain Runnable sequence responsible for the core extraction logic.
 * 2.  `extractFactsFromMessages`: A higher-level function that takes conversation
 *     messages, formats them, invokes the chain, and validates the output.
 * 3.  `extractedFactsSchema` (from ./schemas): A Zod schema defining the desired
 *     structured output format for the extracted facts. This ensures data
 *     consistency.
 *
 * Process Flow (`extractFactsFromMessages`):
 * ------------------------------------------
 * 1.  Input: Receives an array of `BaseMessage` objects representing the
 *     conversation.
 * 2.  Formatting: Concatenates messages into a single string `conversation_text`.
 * 3.  Chain Invocation: Calls `createFactExtractionChain` to get the LLM chain.
 * 4.  Execution: Invokes the configured chain with the `conversation_text`.
 * 5.  Validation: The raw output from the LLM (parsed JSON) is rigorously
 *     validated against the original `extractedFactsSchema` using `safeParse`.
 * 6.  Output: Returns an object `{ facts: [...] }` containing the validated array
 *     of extracted facts. If extraction fails or validation doesn't pass, it
 *     returns `{ facts: [] }` to prevent downstream errors.
 *
 * Design Choices:
 * --------------
 * - Function Calling: Used to ensure the LLM produces structured output conforming
 *   to a predefined schema, greatly improving reliability over simple text parsing.
 * - Zod Schema: Provides a single source of truth for the data structure and enables
 *   robust validation of the LLM's output.
 * - Temperature 0: Minimizes randomness, making the extraction process more
 *   predictable and consistent.
 * ============================================================================
 */

/**
 * Runs the fact extraction chain on a given set of messages.
 */
export async function extractFactsFromMessages({
  messages,
  llmApiKey,
  modelName
}: {
  messages: BaseMessage[]
  llmApiKey?: string
  modelName?: string
}) {
  if (!messages || messages.length === 0) {
    return { facts: [] } // Return empty if no messages
  }

  const conversationText = messages
    .map(
      msg =>
        `${msg._getType()}: ${typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}`
    )
    .join("\n")

  // Call the imported function
  const chain = createFactExtractionChain({ llmApiKey, modelName })

  try {
    const result = await chain.invoke({ conversation_text: conversationText })
    // Validate the result against the schema (recommended)
    const parsedResult = extractedFactsSchema.safeParse(result)
    if (parsedResult.success) {
      console.log("Extracted facts:", parsedResult.data.facts)
      return parsedResult.data
    }
    console.error("Fact extraction validation failed:", parsedResult.error)
    return { facts: [] } // Return empty on validation failure
  } catch (error) {
    console.error("Error during fact extraction:", error)
    return { facts: [] } // Return empty on error
  }
}

// Example Usage (conceptual, e.g., in a background job or API route):
/*
async function processConversationForFacts(chatId: string, userId: string) {
    const history = new SupabaseChatMessageHistory({ chatId, userId, client: supabase }); // Use appropriate client
    const messages = await history.getMessages();

    const extractedData = await extractFactsFromMessages({ messages });

    if (extractedData.facts.length > 0) {
        // TODO: Store extractedData.facts in a dedicated Supabase table (Feature #4)
        console.log(`Storing ${extractedData.facts.length} facts for user ${userId}`);
        // await storeExtractedFacts(userId, extractedData.facts);
    }
}
*/
