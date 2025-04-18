import { ChatOpenAI } from "@langchain/openai"
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
 * Uses OpenAI Function Calling to ensure structured output based on extractedFactsSchema.
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
