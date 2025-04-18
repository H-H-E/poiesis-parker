import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate
} from "@langchain/core/prompts"
import { JsonOutputFunctionsParser } from "langchain/output_parsers"
import { zodToJsonSchema } from "zod-to-json-schema"
import { extractedFactsSchema } from "./schemas" // Adjust path if needed

/**
 * Creates a LangChain chain that extracts structured facts from conversation text.
 * Uses Google Gemini's Tool Calling (Function Calling) to ensure structured output
 * based on extractedFactsSchema.
 *
 * @param apiKey - The Google AI Studio API Key.
 * @param modelName - The name of the Gemini model to use (defaults to gemini-1.5-flash-latest).
 * @returns A LangChain runnable sequence for extracting facts.
 */
export function createFactExtractionChain({
  apiKey, // Pass API key explicitly for server-side use (Google AI Studio API Key)
  modelName = "gemini-1.5-flash-latest" // Default to latest flash model
}: {
  apiKey?: string
  modelName?: string
}) {
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      "Extract relevant facts, preferences, learning goals, and struggles mentioned by the student in the following conversation. Focus on atomic pieces of information. If no relevant facts are found, return an empty array."
    ),
    HumanMessagePromptTemplate.fromTemplate("{conversation_text}")
  ])

  // Instantiate Gemini model
  const llm = new ChatGoogleGenerativeAI({
    // <-- Changed to Gemini
    apiKey: apiKey ?? process.env.GOOGLE_API_KEY, // <-- Use appropriate env var
    modelName: modelName,
    temperature: 0 // Low temperature for reliable extraction
    // Note: Ensure GOOGLE_API_KEY is set in your environment
  })

  const extractionFunctionName = "extractStudentFacts"

  // Bind the schema as a function call (tool) to the LLM
  const extractionLlm = llm.bind({
    // <-- Gemini uses bind for tools too
    tools: [
      // <-- Gemini uses 'tools' instead of 'functions'
      {
        name: extractionFunctionName,
        description:
          "Extracts facts, preferences, goals, or struggles from a student conversation.",
        parameters: zodToJsonSchema(extractedFactsSchema)
      }
    ],
    // Specify the tool to use. For simple cases with one tool, this ensures it's called.
    // For more complex scenarios, you might omit this or use a different strategy.
    tool_choice: extractionFunctionName
  })

  // Assuming JsonOutputFunctionsParser works for Gemini's tool call output structure via Langchain.
  // If it returns arguments directly, a different parsing step might be needed.
  const parser = new JsonOutputFunctionsParser({ argsOnly: true }) // Use argsOnly based on common Gemini tool patterns

  const chain = prompt.pipe(extractionLlm).pipe(parser) // Parses the tool call output

  return chain
}
