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

/**
 * Creates a LangChain chain that extracts structured facts from conversation text.
 */
export function createFactExtractionChain({
  llmApiKey, // Pass API key explicitly for server-side use
  modelName = "gpt-3.5-turbo" // Use a capable model
}: {
  llmApiKey?: string
  modelName?: string
}) {
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      "Extract relevant facts, preferences, learning goals, and struggles mentioned by the student in the following conversation. Focus on atomic pieces of information. If no relevant facts are found, return an empty array."
    ),
    HumanMessagePromptTemplate.fromTemplate("{conversation_text}")
  ])

  const llm = new ChatOpenAI({
    openAIApiKey: llmApiKey ?? process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0 // Low temperature for reliable extraction
  })

  const extractionFunctionName = "extractStudentFacts"

  // Bind the schema as a function call to the LLM
  const extractionLlm = llm.bind({
    functions: [
      {
        name: extractionFunctionName,
        description:
          "Extracts facts, preferences, goals, or struggles from a student conversation.",
        parameters: zodToJsonSchema(extractedFactsSchema)
      }
    ],
    function_call: { name: extractionFunctionName }
  })

  const chain = prompt.pipe(extractionLlm).pipe(new JsonOutputFunctionsParser()) // Parses the function call output

  return chain
}

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

  const chain = createFactExtractionChain({ llmApiKey, modelName })

  try {
    const result = await chain.invoke({ conversation_text: conversationText })
    // Validate the result against the schema (optional but recommended)
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
